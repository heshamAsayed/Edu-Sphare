using EduSphare.Application.Services.Interface.Ai;
using EduSphare.Application.Services.Interface.Courses;
using EduSphare.Domain.Entities;
using EduSphare.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace EduSphare.Infrastructure.Services.Ai;

public class BackgroundTranscriptionService : BackgroundService
{
    private readonly IVideoTranscriptionQueue _queue;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<BackgroundTranscriptionService> _logger;

    public BackgroundTranscriptionService(
        IVideoTranscriptionQueue queue,
        IServiceProvider serviceProvider,
        ILogger<BackgroundTranscriptionService> logger)
    {
        _queue = queue;
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Background Deepgram transcription service is running.");
        await RecoverInterruptedTranscriptionsAsync(stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var item = await _queue.DequeueAsync(stoppingToken);
                if (item == null) continue;

                var videoId = item.Item1;
                var temporaryVideoPath = item.Item2;

                _logger.LogInformation("Processing Deepgram transcription for VideoId: {VideoId}", videoId);

                using var scope = _serviceProvider.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                var deepgramService = scope.ServiceProvider.GetRequiredService<IDeepgramTranscriptionService>();
                var quizService = scope.ServiceProvider.GetRequiredService<IAiAttentionQuestionService>();
                var uploadService = scope.ServiceProvider.GetRequiredService<IUploadVideo>();

                var videoEntity = await dbContext.Videos
                    .FirstOrDefaultAsync(v => v.Id == videoId, stoppingToken);
                if (videoEntity == null)
                {
                    await DeleteTemporaryFileWhenAvailableAsync(temporaryVideoPath, stoppingToken);
                    continue;
                }

                videoEntity.TranscriptionStatus = "Processing";
                videoEntity.TranscriptionError = null;
                await dbContext.SaveChangesAsync(stoppingToken);

                const int maxAttempts = 3;
                for (var attempt = 1; attempt <= maxAttempts; attempt++)
                {
                    try
                    {
                        _logger.LogInformation("Deepgram attempt {Attempt}/{MaxAttempts} for VideoId: {VideoId}", attempt, maxAttempts, videoId);
                        // Prefer the independent local Deepgram copy. If this worker was
                        // restarted and that temporary file disappeared, recover from Bunny.
                        DeepgramTranscriptionResult result;
                        if (File.Exists(temporaryVideoPath))
                        {
                            result = await deepgramService.TranscribeFileAsync(temporaryVideoPath, videoId, stoppingToken);
                        }
                        else
                        {
                            if (string.IsNullOrWhiteSpace(videoEntity.BunnyVideoId))
                                throw new InvalidOperationException("No original file or Bunny video is available for transcription.");
                            await uploadService.WaitForVideoReadyAsync(videoEntity.BunnyVideoId, stoppingToken);
                            var mediaUrl = await uploadService.GetTranscriptionMediaUrlAsync(videoEntity.BunnyVideoId, stoppingToken);
                            result = await deepgramService.TranscribeUrlAsync(mediaUrl, videoId, stoppingToken);
                        }
                        videoEntity.TranscriptionText = result.Transcript;
                        videoEntity.TranscriptionStatus = "Completed";
                        videoEntity.TranscriptionError = null;
                        EduSphare.Application.Services.UploadProgressTracker.SetCompleted($"deepgram_{videoId}");
                        // Prepare the randomized end-of-video quiz now, so it is ready
                        // by the time the student reaches the final seconds.
                        try
                        {
                            var questions = await quizService.GenerateVideoQuizAsync(result.Transcript, stoppingToken);
                            if (questions?.Count > 0)
                            {
                                videoEntity.GeneratedQuestionsJson = System.Text.Json.JsonSerializer.Serialize(questions);
                                _logger.LogInformation("Generated {Count} quiz questions for VideoId: {VideoId}", questions.Count, videoId);
                            }
                        }
                        catch (Exception quizEx)
                        {
                            // A quiz generation problem must not discard a successful transcript.
                            _logger.LogError(quizEx, "Quiz generation failed for VideoId: {VideoId}", videoId);
                        }
                        _logger.LogInformation("Deepgram transcription completed for VideoId: {VideoId} (RequestId: {RequestId})", videoId, result.RequestId);
                        break;
                    }
                    catch (Exception ex) when (attempt < maxAttempts)
                    {
                        _logger.LogWarning(ex, "Deepgram attempt {Attempt}/{MaxAttempts} failed for VideoId: {VideoId}; retrying.", attempt, maxAttempts, videoId);
                        videoEntity.TranscriptionStatus = "Retrying";
                        videoEntity.TranscriptionError = $"المحاولة {attempt} فشلت: {ex.Message}";
                        await dbContext.SaveChangesAsync(stoppingToken);
                        EduSphare.Application.Services.UploadProgressTracker.UpdateProgress($"deepgram_{videoId}", 0, 0, "Retrying");
                        await Task.Delay(TimeSpan.FromSeconds(attempt * 8), stoppingToken);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Deepgram failed after {MaxAttempts} attempts for VideoId: {VideoId}", maxAttempts, videoId);
                        videoEntity.TranscriptionStatus = "Failed";
                        videoEntity.TranscriptionError = ex.Message;
                        EduSphare.Application.Services.UploadProgressTracker.SetFailed($"deepgram_{videoId}", ex.Message);
                    }
                }

                await dbContext.SaveChangesAsync(stoppingToken);

                await DeleteTemporaryFileWhenAvailableAsync(temporaryVideoPath, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in BackgroundTranscriptionService.");
            }
        }
    }

    private async Task RecoverInterruptedTranscriptionsAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var pending = await dbContext.Videos
            .Where(v => v.BunnyVideoId != null &&
                (v.TranscriptionStatus == "Pending" || v.TranscriptionStatus == "Processing" || v.TranscriptionStatus == "Retrying"))
            .Select(v => v.Id)
            .ToListAsync(cancellationToken);

        foreach (var videoId in pending)
            _queue.QueueVideoForTranscription(videoId, string.Empty);

        if (pending.Count > 0)
            _logger.LogInformation("Requeued {Count} interrupted video transcription job(s) from Bunny.", pending.Count);
    }

    private async Task DeleteTemporaryFileWhenAvailableAsync(string path, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(path)) return;
        // Bunny may still be reading the same temp file while Deepgram finishes.
        // Retry a short time rather than deleting a file still needed for the upload.
        for (var attempt = 0; attempt < 120 && File.Exists(path); attempt++)
        {
            try { File.Delete(path); return; }
            catch (IOException) { await Task.Delay(TimeSpan.FromSeconds(1), cancellationToken); }
            catch (UnauthorizedAccessException) { await Task.Delay(TimeSpan.FromSeconds(1), cancellationToken); }
        }

        if (File.Exists(path))
            _logger.LogWarning("Could not delete transcription temp file {Path} after Bunny upload window.", path);
    }
}
