namespace EduSphare.Application.DTOs.Courses;

public class VideoDTo
{
    public string Id { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public string Resource { get; set; } = string.Empty;
    public string BankQuotationsPath { get; set; } = string.Empty;
    public string CourseId { get; set; } = string.Empty;
    public bool IsWatched { get; set; }

    /// <summary>
    /// Bunny Stream video GUID used for iframe embed playback.
    /// </summary>
    public string BunnyVideoId { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Tags { get; set; }
    public int AvailabilityDays { get; set; }
    public IReadOnlyCollection<VideoAttachmentDto> Attachments { get; set; } = [];
}

public class VideoAttachmentDto
{
    public string Id { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
}

public class VideoTranscriptionStatusDto
{
    public string VideoId { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending";
    public string? ErrorMessage { get; set; }
}

public class VideoTeacherStatisticsDto
{
    public string VideoId { get; set; } = string.Empty;
    public int EnrolledStudentsCount { get; set; }
    public int WatchedStudentsCount { get; set; }
    public decimal? AveragePostVideoQuizScore { get; set; }
    public decimal? AverageFocusPercent { get; set; }
    public int AbsentStudentsCount { get; set; }
}
