using System.Collections.Concurrent;

namespace EduSphare.Application.Services;

public class UploadProgressInfo
{
    public long BytesUploaded { get; set; }
    public long TotalBytes { get; set; }
    public int Percent { get; set; }
    public string Status { get; set; } = "Uploading";
    public string? ErrorMessage { get; set; }
}

public static class UploadProgressTracker
{
    private static readonly ConcurrentDictionary<string, UploadProgressInfo> _progress = new();

    public static void UpdateProgress(string uploadId, long bytesUploaded, long totalBytes, string status = "Uploading")
    {
        if (string.IsNullOrWhiteSpace(uploadId)) return;

        int percent = totalBytes > 0 ? (int)Math.Min(100, (bytesUploaded * 100) / totalBytes) : 0;
        _progress[uploadId] = new UploadProgressInfo
        {
            BytesUploaded = bytesUploaded,
            TotalBytes = totalBytes,
            Percent = percent,
            Status = status
        };
    }

    public static void SetCompleted(string uploadId)
    {
        if (string.IsNullOrWhiteSpace(uploadId)) return;
        _progress[uploadId] = new UploadProgressInfo { Percent = 100, Status = "Completed" };
    }

    public static void SetFailed(string uploadId, string error)
    {
        if (string.IsNullOrWhiteSpace(uploadId)) return;
        _progress[uploadId] = new UploadProgressInfo { Percent = 0, Status = "Failed", ErrorMessage = error };
    }

    public static UploadProgressInfo? GetProgress(string uploadId)
    {
        if (string.IsNullOrWhiteSpace(uploadId)) return null;
        _progress.TryGetValue(uploadId, out var info);
        return info;
    }

    public static void Remove(string uploadId)
    {
        if (string.IsNullOrWhiteSpace(uploadId)) return;
        _progress.TryRemove(uploadId, out _);
    }
}
