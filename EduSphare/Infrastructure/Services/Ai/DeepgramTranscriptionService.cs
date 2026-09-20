using EduSphare.Application.Services;
using EduSphare.Application.Services.Interface.Ai;
using EduSphare.Infrastructure.Settings;
using Deepgram;
using Microsoft.Extensions.Options;
using System.Net.Http.Headers;
using System.Text.Json;

namespace EduSphare.Infrastructure.Services.Ai;

/// <summary>
/// Handles sending video content to Deepgram's pre-recorded speech-to-text API,
/// either as a direct file upload (raw bytes) or as a remote URL (e.g. a Bunny Stream
/// MP4 fallback link), and parses the resulting transcript.
/// </summary>
public class DeepgramTranscriptionService(
    IOptions<DeepgramSettings> settings,
    IHttpClientFactory httpClientFactory,
    ILogger<DeepgramTranscriptionService> logger) : IDeepgramTranscriptionService
{
    static DeepgramTranscriptionService()
    {
        Library.Initialize();
    }

    /// <summary>
    /// Uploads a local video file's bytes directly to Deepgram for transcription.
    /// Use this when you don't have (or don't want to rely on) a publicly reachable
    /// URL for the media — e.g. before the Bunny upload/encode has finished.
    /// Streams the file so large videos don't need to be fully buffered in memory,
    /// and reports upload progress via UploadProgressTracker.
    /// </summary>
    public async Task<DeepgramTranscriptionResult> TranscribeFileAsync(string filePath, string videoId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(filePath) || !File.Exists(filePath))
            throw new FileNotFoundException("Video file for transcription was not found.", filePath);

        var config = settings.Value;
        if (string.IsNullOrWhiteSpace(config.ApiKey))
            throw new InvalidOperationException("Deepgram API key is not configured.");

        logger.LogInformation("Sending original file directly to Deepgram for VideoId: {VideoId}", videoId);
        var progressId = $"deepgram_{videoId}";
        UploadProgressTracker.UpdateProgress(progressId, 0, new FileInfo(filePath).Length, "UploadingToDeepgram");

        using var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite, 81920, useAsync: true);
        using var request = CreateRequest(config, videoId);

        request.Content = new ProgressStreamContent(stream, progressId, "UploadingToDeepgram");

        // FIX: Deepgram needs to know the media type of the raw bytes it's receiving.
        // Without this header, Deepgram cannot reliably decode the stream and returns
        // "corrupt or unsupported data" even though the file itself is a valid MP4.
        request.Content.Headers.ContentType = new MediaTypeHeaderValue("video/mp4");

        using var response = await httpClientFactory.CreateClient("Deepgram")
            .SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        var payload = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            UploadProgressTracker.SetFailed(progressId, payload);
            throw new InvalidOperationException($"Deepgram returned {(int)response.StatusCode}: {payload}");
        }

        UploadProgressTracker.UpdateProgress(progressId, stream.Length, stream.Length, "ExtractingTranscript");
        return ParseResult(payload);
    }

    /// <summary>
    /// Sends a publicly reachable media URL (e.g. a Bunny Stream MP4 fallback link)
    /// to Deepgram. Deepgram fetches the file itself server-side, so no bandwidth is
    /// spent on our own server re-uploading the video. Preferred path once the Bunny
    /// encode/MP4-fallback is ready for the video.
    /// </summary>
    public async Task<DeepgramTranscriptionResult> TranscribeUrlAsync(string mediaUrl, string videoId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(mediaUrl))
            throw new ArgumentException("A Bunny media URL is required for transcription.", nameof(mediaUrl));

        var config = settings.Value;
        if (string.IsNullOrWhiteSpace(config.ApiKey))
            throw new InvalidOperationException("Deepgram API key is not configured.");

        logger.LogInformation("Sending Bunny media URL to Deepgram for VideoId: {VideoId}", videoId);
        using var request = CreateRequest(config, videoId);
        request.Content = JsonContent.Create(new { url = mediaUrl });

        using var response = await httpClientFactory.CreateClient("Deepgram")
            .SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        var payload = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"Deepgram returned {(int)response.StatusCode}: {payload}");

        return ParseResult(payload);
    }

    /// <summary>
    /// Builds the shared POST request (endpoint, query params, and headers) used by
    /// both the file-upload and URL-based transcription paths. Only the request body
    /// differs between the two callers.
    /// </summary>
    private static HttpRequestMessage CreateRequest(DeepgramSettings config, string videoId)
    {
        // FIX: "punctuate" was previously left out of the live query string (it only
        // existed in a commented-out line above it), so Deepgram was never receiving
        // it even though config.Punctuate was configured. Now all four options are
        // actually sent.
        var request = new HttpRequestMessage(HttpMethod.Post,
            $"https://api.deepgram.com/v1/listen" +
            $"?model={Uri.EscapeDataString(config.Model)}" +
            $"&language={Uri.EscapeDataString(config.Language)}" +
            $"&smart_format={config.SmartFormat.ToString().ToLowerInvariant()}" +
            $"&punctuate={config.Punctuate.ToString().ToLowerInvariant()}");

        request.Headers.Authorization = new AuthenticationHeaderValue("Token", config.ApiKey.Trim());

        // Internal tracing header only — not read or used by Deepgram itself.
        request.Headers.Add("X-Alpha-Video-Id", videoId);
        return request;
    }

    /// <summary>
    /// Parses Deepgram's JSON response and extracts the transcript, confidence score,
    /// request id, and audio duration into a strongly-typed result. Throws if the
    /// transcript comes back empty (e.g. silent or unintelligible audio).
    /// </summary>
    private static DeepgramTranscriptionResult ParseResult(string payload)
    {
        using var document = JsonDocument.Parse(payload);
        var root = document.RootElement;
        var alternative = root.GetProperty("results").GetProperty("channels")[0].GetProperty("alternatives")[0];
        var transcript = alternative.GetProperty("transcript").GetString()?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(transcript))
            throw new InvalidOperationException("Deepgram returned an empty transcript.");

        return new DeepgramTranscriptionResult(
            transcript,
            alternative.TryGetProperty("confidence", out var confidence) ? confidence.GetDouble() : null,
            root.TryGetProperty("metadata", out var metadata) && metadata.TryGetProperty("request_id", out var requestId) ? requestId.GetString() : null,
            root.TryGetProperty("metadata", out metadata) && metadata.TryGetProperty("duration", out var duration) ? duration.GetDouble() : null);
    }
}