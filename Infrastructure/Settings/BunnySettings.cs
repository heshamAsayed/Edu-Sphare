namespace EduSphare.Infrastructure.Settings;

/// <summary>
/// Configuration settings for Bunny Stream API.
/// Bound from appsettings.json["BunnySetting"]
/// </summary>
public class BunnySettings
{
    public const string SectionName = "BunnySetting";

    /// <summary>
    /// Base URL for Bunny Stream API (e.g., "https://video.bunnycdn.com/library/")
    /// </summary>
    public string BaseUrl { get; set; } = string.Empty;

    /// <summary>
    /// Bunny API Access Key for authentication.
    /// </summary>
    public string AccessKey { get; set; } = string.Empty;

    /// <summary>
    /// Library ID in Bunny Stream (e.g., "728031")
    /// </summary>
    public string LibraryID { get; set; } = string.Empty;

    /// <summary>
    /// CDN hostname for video playback/transcription (e.g., "vz-728031.b-cdn.net").
    /// Defaults to vz-{LibraryID}.b-cdn.net when empty.
    /// </summary>
    public string CdnHostname { get; set; } = string.Empty;

    /// <summary>
    /// Bunny CDN Token Authentication key. When set, transcription URLs are signed.
    /// </summary>
    public string TokenSecurityKey { get; set; } = string.Empty;

    /// <summary>
    /// Signed URL lifetime in minutes for Deepgram fetch.
    /// </summary>
    public int SignedUrlExpirationMinutes { get; set; } = 10;
}
