namespace EduSphare.Application.Services.Interface.Ai;

public record DeepgramTranscriptionResult(
    string Transcript,
    double? Confidence,
    string? RequestId,
    double? DurationSeconds);

public interface IDeepgramTranscriptionService
{
    Task<DeepgramTranscriptionResult> TranscribeFileAsync(string filePath, string videoId, CancellationToken cancellationToken = default);
    Task<DeepgramTranscriptionResult> TranscribeUrlAsync(string mediaUrl, string videoId, CancellationToken cancellationToken = default);
}
