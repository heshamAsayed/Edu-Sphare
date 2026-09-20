namespace EduSphare.Application.Services.Interface.Courses;

/// <summary>
/// Abstraction for video upload operations to support multiple providers (Bunny, S3, etc.).
/// Follows the abstraction pattern to maintain clean architecture.
/// </summary>
public interface IUploadVideo
{
    /// <summary>
    /// Creates a new video on the provider and returns the provider's video ID.
    /// </summary>
    Task<string> CreateVideoAsync(string title, string? description = null, string[]? tags = null);

    /// <summary>
    /// Uploads a video file to the provider for a specific video ID with optional progress tracking.
    /// </summary>
    Task UploadVideoFileAsync(string videoId, Stream fileStream, string fileName, string? uploadId = null);

    /// <summary>
    /// Deletes a video from the provider.
    /// </summary>
    Task DeleteVideoAsync(string videoId);

    /// <summary>
    /// Updates video metadata on the provider (title, description, tags).
    /// </summary>
    Task UpdateVideoMetadataAsync(string videoId, string? title = null, string? description = null, string[]? tags = null);

    /// <summary>
    /// Waits until the provider finishes processing the uploaded video.
    /// </summary>
    Task WaitForVideoReadyAsync(string videoId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns a public or signed CDN URL that Deepgram can fetch for transcription.
    /// </summary>
    Task<string> GetTranscriptionMediaUrlAsync(string videoId, CancellationToken cancellationToken = default);
}
