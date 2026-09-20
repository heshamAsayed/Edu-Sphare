using EduSphare.Application.Services.Interface.Courses;
using EduSphare.Infrastructure.Settings;
using Microsoft.Extensions.Options;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Serialization;

namespace EduSphare.Application.Services.Implement.StreamVideo;

/// <summary>
/// Bunny Stream video upload service implementation.
/// Handles creation, upload, deletion, and metadata updates of videos on Bunny Stream.
/// </summary>
public class BunnyStreamUploadService : IUploadVideo
{
    private readonly HttpClient _httpClient;
    private readonly BunnySettings _settings;
    private readonly ILogger<BunnyStreamUploadService> _logger;

    public BunnyStreamUploadService(
        HttpClient httpClient,
        IOptions<BunnySettings> settings,
        ILogger<BunnyStreamUploadService> logger)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
        _logger = logger;

        ConfigureHttpClient();
    }

    /// <summary>
    /// Configures the HttpClient with Bunny Stream base address and headers.
    /// OpenAPI URL structure: https://video.bunnycdn.com/library/{libraryId}/
    /// Header: AccessKey
    /// </summary>
    private void ConfigureHttpClient()
    {
        var baseUrl = _settings.BaseUrl.TrimEnd('/') + "/";
        _httpClient.BaseAddress = new Uri($"{baseUrl}{_settings.LibraryID}/");
        _httpClient.DefaultRequestHeaders.Remove("AccessKey");
        _httpClient.DefaultRequestHeaders.Add("AccessKey", _settings.AccessKey);
        _httpClient.Timeout = TimeSpan.FromHours(2);
    }

    /// <summary>
    /// Creates a new video entry on Bunny Stream (POST /library/{libraryId}/videos)
    /// </summary>
    public async Task<string> CreateVideoAsync(string title, string? description = null, string[]? tags = null)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            throw new ArgumentException("Video title is required.", nameof(title));
        }

        _logger.LogInformation("Creating Bunny video with Title: {Title}", title);

        try
        {
            var createVideoUrl = $"videos";

            using var request = new HttpRequestMessage(HttpMethod.Post, createVideoUrl)
            {
                Content = System.Net.Http.Json.JsonContent.Create(new
                {
                    title = title
                })
            };

            var response = await _httpClient.SendAsync(request);
            var responseContent = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError($"Bunny Stream Create Video error ({response.StatusCode}): {responseContent}");
                throw new InvalidOperationException($"Failed to create video on Bunny Stream (Status: {response.StatusCode}): {responseContent}");
            }

            var createdVideo = System.Text.Json.JsonSerializer.Deserialize<BunnyCreateVideoResponse>(
                responseContent,
                new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (string.IsNullOrWhiteSpace(createdVideo?.Guid))
                throw new InvalidOperationException("Failed to create video: No GUID returned from Bunny.");

            _logger.LogInformation($"Video created on Bunny Stream with ID: {createdVideo.Guid}");

            if (!string.IsNullOrWhiteSpace(description) || tags?.Length > 0)
            {
                await UpdateVideoMetadataAsync(createdVideo.Guid, title, description, tags);
            }

            return createdVideo.Guid;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError($"Failed to create video on Bunny Stream: {ex.Message}");
            throw new InvalidOperationException($"Failed to create video on Bunny Stream: {ex.Message}", ex);
        }
    }

    /// <summary>
    /// Uploads the video file binary content to Bunny Stream (PUT /library/{libraryId}/videos/{videoId})
    /// </summary>
    public async Task UploadVideoFileAsync(string videoId, Stream fileStream, string fileName, string? uploadId = null)
    {
        try
        {
            var uploadUrl = $"videos/{videoId}";

            using HttpContent content = !string.IsNullOrWhiteSpace(uploadId)
                ? new ProgressStreamContent(fileStream, uploadId)
                : new StreamContent(fileStream);

            if (string.IsNullOrWhiteSpace(uploadId))
            {
                content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/octet-stream");
            }

            var response = await _httpClient.PutAsync(uploadUrl, content);
            var responseContent = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError($"Bunny Stream Upload Video File error ({response.StatusCode}): {responseContent}");
                throw new InvalidOperationException($"Failed to upload video file to Bunny Stream (Status: {response.StatusCode}): {responseContent}");
            }

            _logger.LogInformation($"Video file uploaded successfully for Bunny video ID: {videoId}");
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError($"Failed to upload video file to Bunny Stream: {ex.Message}");
            throw new InvalidOperationException($"Failed to upload video file to Bunny Stream: {ex.Message}", ex);
        }
    }

    /// <summary>
    /// Deletes a video from Bunny Stream.
    /// </summary>
    public async Task DeleteVideoAsync(string videoId)
    {
        try
        {
            var response = await _httpClient.DeleteAsync($"videos/{videoId}");
            response.EnsureSuccessStatusCode();

            _logger.LogInformation($"Video deleted from Bunny Stream: {videoId}");
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError($"Failed to delete video from Bunny Stream: {ex.Message}");
            throw new InvalidOperationException("Failed to delete video from Bunny Stream.", ex);
        }
    }

    /// <summary>
    /// Updates video metadata (title, description, tags) on Bunny Stream.
    /// </summary>
    public async Task UpdateVideoMetadataAsync(string videoId, string? title = null, string? description = null, string[]? tags = null)
    {
        try
        {
            var metaTags = new List<BunnyMetaTag>();

            if (!string.IsNullOrWhiteSpace(description))
            {
                metaTags.Add(new BunnyMetaTag { Property = "description", Value = description });
            }

            if (tags?.Length > 0)
            {
                metaTags.Add(new BunnyMetaTag { Property = "keywords", Value = string.Join(",", tags) });
            }

            var request = new BunnyUpdateVideoRequest
            {
                Title = title,
                MetaTags = metaTags.Count > 0 ? metaTags : null
            };

            var content = new StringContent(
                System.Text.Json.JsonSerializer.Serialize(request),
                System.Text.Encoding.UTF8,
                "application/json");

            var response = await _httpClient.PostAsync($"videos/{videoId}", content);
            response.EnsureSuccessStatusCode();

            _logger.LogInformation($"Video metadata updated on Bunny Stream: {videoId}");
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError($"Failed to update video metadata on Bunny Stream: {ex.Message}");
            throw new InvalidOperationException("Failed to update video metadata on Bunny Stream.", ex);
        }
    }

    /// <summary>
    /// Polls Bunny until the video finishes encoding (status 4) or timeout is reached.
    /// </summary>
    public async Task WaitForVideoReadyAsync(string videoId, CancellationToken cancellationToken = default)
    {
        // reuse new helper to wait for encoding completion, but discard returned details here
        await GetVideoDetailsWhenReadyAsync(videoId, cancellationToken);
    }

    /// <summary>
    /// Builds a CDN URL (signed when TokenSecurityKey is configured) for Deepgram to fetch the MP4.
    /// </summary>
    public async Task<string> GetTranscriptionMediaUrlAsync(string videoId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        // 1) Wait for encoding completion and get video details JSON
        var detailsJson = await GetVideoDetailsWhenReadyAsync(videoId, cancellationToken);

        _logger.LogInformation("Bunny video {VideoId}: fetched details.", videoId);

        // 2) Parse relevant fields: status, encodeProgress, availableResolutions, hasMP4Fallback
        string availableResolutions = string.Empty;
        int? status = null;
        int? encodeProgress = null;
        bool? hasMp4Fallback = null;

        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(detailsJson);
            var root = doc.RootElement;
            if (root.TryGetProperty("status", out var st) && st.TryGetInt32(out var s)) status = s;
            if (root.TryGetProperty("encodeProgress", out var ep) && ep.TryGetInt32(out var e)) encodeProgress = e;
            if (root.TryGetProperty("availableResolutions", out var ar) && ar.ValueKind == System.Text.Json.JsonValueKind.String)
                availableResolutions = ar.GetString() ?? string.Empty;
            if (root.TryGetProperty("hasMP4Fallback", out var hf) && hf.ValueKind == System.Text.Json.JsonValueKind.True)
                hasMp4Fallback = true;
            else if (root.TryGetProperty("hasMP4Fallback", out var hf2) && hf2.ValueKind == System.Text.Json.JsonValueKind.False)
                hasMp4Fallback = false;
        }
        catch (System.Text.Json.JsonException ex)
        {
            _logger.LogWarning(ex, "Failed parsing Bunny video details JSON for {VideoId}", videoId);
        }

        _logger.LogInformation("Bunny video {VideoId}: Status={Status} EncodeProgress={EncodeProgress} AvailableResolutions={AvailableResolutions} HasMP4Fallback={HasMP4Fallback}",
            videoId, status?.ToString() ?? "unknown", encodeProgress?.ToString() ?? "unknown", availableResolutions, hasMp4Fallback?.ToString() ?? "unknown");

        // 3) Determine candidates from availableResolutions when encoding complete and fallback available
        if (!(status == 4 && encodeProgress == 100 && (hasMp4Fallback == true || !string.IsNullOrWhiteSpace(availableResolutions))))
            throw new InvalidOperationException($"Video {videoId} is not ready or does not have MP4 fallback. Status={status} EncodeProgress={encodeProgress} HasMP4Fallback={hasMp4Fallback}");

        if (string.IsNullOrWhiteSpace(availableResolutions))
            throw new InvalidOperationException($"No available resolutions provided by Bunny for video {videoId}.");

        var resolutions = availableResolutions.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(r => !string.IsNullOrWhiteSpace(r)).ToList();

        if (!resolutions.Any())
            throw new InvalidOperationException($"No available resolutions provided by Bunny for video {videoId}.");

        // prefer lower resolution first
        int ParseResOrder(string r)
        {
            var m = System.Text.RegularExpressions.Regex.Match(r, "(?<digits>\\d+)", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (m.Success && int.TryParse(m.Groups["digits"].Value, out var v)) return v;
            return int.MaxValue;
        }

        var ordered = resolutions.OrderBy(ParseResOrder).ToList();
        var cdnBase = ResolveCdnBaseUrl();

        foreach (var res in ordered)
        {
            var fileName = $"play_{res}.mp4"; // e.g. play_240p.mp4
            var filePath = $"/{videoId}/{fileName}";
            var candidateUrl = string.IsNullOrWhiteSpace(_settings.TokenSecurityKey)
                ? $"{cdnBase.TrimEnd('/')}{filePath}"
                : GenerateSignedCdnUrl(cdnBase, filePath, _settings.SignedUrlExpirationMinutes, _settings.TokenSecurityKey);

            _logger.LogInformation("Testing Bunny MP4 candidate: {Url}", candidateUrl);

            // Try HEAD first
            try
            {
                using var headReq = new HttpRequestMessage(HttpMethod.Head, candidateUrl);
                var headResp = await _httpClient.SendAsync(headReq, cancellationToken);
                if (headResp.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Selected Bunny MP4 URL: {Url}", candidateUrl);
                    return candidateUrl;
                }

                // If HEAD not allowed or returned client error, try GET range
                if (headResp.StatusCode == System.Net.HttpStatusCode.MethodNotAllowed
                    || headResp.StatusCode == System.Net.HttpStatusCode.NotImplemented
                    || headResp.StatusCode == System.Net.HttpStatusCode.BadRequest
                    || headResp.StatusCode == System.Net.HttpStatusCode.Forbidden
                    || headResp.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    using var getReq = new HttpRequestMessage(HttpMethod.Get, candidateUrl);
                    getReq.Headers.Range = new System.Net.Http.Headers.RangeHeaderValue(0, 0);
                    var getResp = await _httpClient.SendAsync(getReq, cancellationToken);
                    if (getResp.IsSuccessStatusCode || getResp.StatusCode == System.Net.HttpStatusCode.PartialContent)
                    {
                        _logger.LogInformation("Selected Bunny MP4 URL: {Url}", candidateUrl);
                        return candidateUrl;
                    }
                    _logger.LogWarning("Bunny MP4 candidate returned {StatusCode}: {Url}", (int)getResp.StatusCode, candidateUrl);
                }
                else
                {
                    _logger.LogWarning("Bunny MP4 candidate returned {StatusCode}: {Url}", (int)headResp.StatusCode, candidateUrl);
                }
            }
            catch (HttpRequestException ex)
            {
                _logger.LogWarning(ex, "HTTP check failed for candidate {Url}", candidateUrl);
            }
        }

        throw new InvalidOperationException($"No accessible MP4 file found for Bunny video {videoId}. Available resolutions: {availableResolutions}");
    }

    private string ResolveCdnBaseUrl()
    {
        var hostname = string.IsNullOrWhiteSpace(_settings.CdnHostname)
            ? $"vz-{_settings.LibraryID}.b-cdn.net"
            : _settings.CdnHostname.Trim().TrimEnd('/');

        return hostname.StartsWith("http", StringComparison.OrdinalIgnoreCase)
            ? hostname
            : $"https://{hostname}";
    }

    private static string GenerateSignedCdnUrl(string cdnBase, string filePath, int expirationMinutes, string securityKey)
    {
        if (!filePath.StartsWith('/'))
            filePath = "/" + filePath;

        var expires = DateTimeOffset.UtcNow.AddMinutes(expirationMinutes).ToUnixTimeSeconds();
        var hashableBase = securityKey + filePath + expires;

        var hashBytes = MD5.HashData(Encoding.UTF8.GetBytes(hashableBase));
        var token = Convert.ToBase64String(hashBytes)
            .Replace("+", "-", StringComparison.Ordinal)
            .Replace("/", "_", StringComparison.Ordinal)
            .TrimEnd('=');

        return $"{cdnBase.TrimEnd('/')}{filePath}?token={token}&expires={expires}";
    }

    private async Task<string> GetVideoDetailsWhenReadyAsync(string videoId, CancellationToken cancellationToken)
    {
        const int maxAttempts = 40;
        var delay = TimeSpan.FromSeconds(5);

        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            cancellationToken.ThrowIfCancellationRequested();

            using var request = new HttpRequestMessage(HttpMethod.Get, $"videos/{videoId}");
            var response = await _httpClient.SendAsync(request, cancellationToken);
            var content = await response.Content.ReadAsStringAsync(cancellationToken);

            if (response.IsSuccessStatusCode)
            {
                // Try to read status property if present, but do not assume property name - attempt common ones
                int? status = null;
                try
                {
                    using var doc = System.Text.Json.JsonDocument.Parse(content);
                    if (doc.RootElement.TryGetProperty("status", out var statusEl) && statusEl.TryGetInt32(out var s))
                        status = s;
                    else if (doc.RootElement.TryGetProperty("encodingStatus", out var es) && es.TryGetInt32(out var esv))
                        status = esv;
                }
                catch (System.Text.Json.JsonException) { /* ignore parse errors here */ }

                _logger.LogInformation("Bunny video {VideoId} status (if available): {Status} (attempt {Attempt})", videoId, status?.ToString() ?? "unknown", attempt);

                // treat status >= 4 as ready (existing behavior); if no status property present we still continue to attempt
                if (status.HasValue && status.Value >= 4)
                {
                    // return the full JSON content for further inspection
                    return content;
                }

                // Additionally, some Bunny responses may include outputs array indicating available files.
                // If we discover an explicit MP4 in the JSON now, we can stop early.
                var foundMp4 = ExtractMp4Candidates(content).Any();
                if (foundMp4 && status.GetValueOrDefault() >= 2) // if outputs present and encoding progressed a bit
                {
                    _logger.LogInformation("Bunny video {VideoId} has MP4 outputs detected before explicit status >=4. Proceeding.", videoId);
                    return content;
                }
            }
            else
            {
                _logger.LogWarning("Failed to fetch Bunny video details for {VideoId} (status {Status}). Response: {Body}", videoId, response.StatusCode, await response.Content.ReadAsStringAsync(cancellationToken));
            }

            if (attempt == maxAttempts)
                throw new TimeoutException($"Bunny video {videoId} was not ready for transcription within the allowed time. Last fetched content: {await response.Content.ReadAsStringAsync(cancellationToken)}");

            await Task.Delay(delay, cancellationToken);
        }

        throw new TimeoutException($"Timeout waiting for Bunny video {videoId} ready status.");
    }

    private static IEnumerable<string> ExtractMp4Candidates(string json)
    {
        var results = new List<string>();
        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(json);
            void Recurse(System.Text.Json.JsonElement el)
            {
                switch (el.ValueKind)
                {
                    case System.Text.Json.JsonValueKind.Object:
                        foreach (var prop in el.EnumerateObject())
                        {
                            if (prop.Value.ValueKind == System.Text.Json.JsonValueKind.String)
                            {
                                var val = prop.Value.GetString() ?? string.Empty;
                                if (val.EndsWith(".mp4", StringComparison.OrdinalIgnoreCase) || val.Contains(".mp4?", StringComparison.OrdinalIgnoreCase))
                                    results.Add(val);
                            }
                            else
                            {
                                Recurse(prop.Value);
                            }
                        }
                        break;
                    case System.Text.Json.JsonValueKind.Array:
                        foreach (var item in el.EnumerateArray()) Recurse(item);
                        break;
                    case System.Text.Json.JsonValueKind.String:
                        var s = el.GetString() ?? string.Empty;
                        if (s.EndsWith(".mp4", StringComparison.OrdinalIgnoreCase) || s.Contains(".mp4?", StringComparison.OrdinalIgnoreCase))
                            results.Add(s);
                        break;
                    default:
                        break;
                }
            }

            Recurse(doc.RootElement);
        }
        catch (System.Text.Json.JsonException)
        {
            // ignore parse issues - return what we found so far (likely none)
        }

        return results;
    }

    private static string ChooseBestMp4Candidate(IEnumerable<string> candidates, string videoId)
    {
        // Try to infer resolution from filename (e.g. 1080p, 720p, 480p), prefer lower resolution to reduce size.
        int ExtractResolution(string name)
        {
            // find patterns like 1080p, 720p, 480p, or digits like 1080,720
            var m = System.Text.RegularExpressions.Regex.Match(name, @"(?<res>\d{3,4})p", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (m.Success && int.TryParse(m.Groups["res"].Value, out var r)) return r;
            m = System.Text.RegularExpressions.Regex.Match(name, @"(?<res>\d{3,4})(?=\.mp4|_|-)", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (m.Success && int.TryParse(m.Groups["res"].Value, out r)) return r;
            // prefer commonly small keywords
            if (name.IndexOf("360", StringComparison.OrdinalIgnoreCase) >= 0) return 360;
            if (name.IndexOf("480", StringComparison.OrdinalIgnoreCase) >= 0) return 480;
            if (name.IndexOf("720", StringComparison.OrdinalIgnoreCase) >= 0) return 720;
            return int.MaxValue; // unknown -> treat as largest
        }

        var ranked = candidates.Select(c => new { Candidate = c, Res = ExtractResolution(c) })
            .OrderBy(x => x.Res)
            .ThenBy(x => x.Candidate.Length)
            .ToList();

        // pick the first (lowest resolution). If none parsable, just return first candidate.
        return ranked.First().Candidate;
    }

    private async Task<bool> ValidateUrlAsync(string url, CancellationToken cancellationToken)
    {
        try
        {
            using var headReq = new HttpRequestMessage(HttpMethod.Head, url);
            var headResp = await _httpClient.SendAsync(headReq, cancellationToken);

            if (headResp.IsSuccessStatusCode)
                return true;

            // If HEAD not allowed, try tiny GET (range 0-0)
            if (headResp.StatusCode == System.Net.HttpStatusCode.MethodNotAllowed
                || headResp.StatusCode == System.Net.HttpStatusCode.NotImplemented
                || headResp.StatusCode == System.Net.HttpStatusCode.BadRequest)
            {
                using var getReq = new HttpRequestMessage(HttpMethod.Get, url);
                getReq.Headers.Range = new System.Net.Http.Headers.RangeHeaderValue(0, 0);
                var getResp = await _httpClient.SendAsync(getReq, cancellationToken);
                return getResp.IsSuccessStatusCode || getResp.StatusCode == System.Net.HttpStatusCode.PartialContent;
            }

            return false;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Validation request failed for URL {Url}", url);
            return false;
        }
    }
}

/// <summary>
/// DTO for creating a video on Bunny Stream.
/// </summary>
public class BunnyCreateVideoRequest
{
    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("collectionId")]
    public string? CollectionId { get; set; }
}

/// <summary>
/// DTO for Bunny Stream's video creation response.
/// </summary>
public class BunnyCreateVideoResponse
{
    [JsonPropertyName("guid")]
    public string Guid { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("videoLibraryId")]
    public long VideoLibraryId { get; set; }
}

/// <summary>
/// DTO for updating video metadata on Bunny Stream.
/// </summary>
public class BunnyUpdateVideoRequest
{
    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("metaTags")]
    public List<BunnyMetaTag>? MetaTags { get; set; }
}

/// <summary>
/// Represents a metadata tag for Bunny Stream videos.
/// </summary>
public class BunnyMetaTag
{
    [JsonPropertyName("property")]
    public string Property { get; set; } = string.Empty;

    [JsonPropertyName("value")]
    public string Value { get; set; } = string.Empty;
}
