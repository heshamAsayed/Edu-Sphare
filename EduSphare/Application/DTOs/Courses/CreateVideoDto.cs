namespace EduSphare.Application.DTOs.Courses;

using System.ComponentModel.DataAnnotations;

/// <summary>
/// DTO for creating and uploading a single video.
/// </summary>
public class CreateVideoDto
{
    /// <summary>
    /// The course ID that this video belongs to.
    /// </summary>
    public string CourseId { get; set; } = string.Empty;

    /// <summary>
    /// Video title.
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Video description (optional).
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Array of tags for the video (optional).
    /// </summary>
    public string[]? Tags { get; set; }

    /// <summary>
    /// Sort order for the video in the course.
    /// </summary>
    public int SortOrder { get; set; }

    [Range(1, 3650)]
    public int AvailabilityDays { get; set; } = 1;

    /// <summary>
    /// The video file to upload.
    /// </summary>
    public IFormFile? VideoFile { get; set; }

    public List<IFormFile> Attachments { get; set; } = [];
}

/// <summary>
/// DTO for batch uploading multiple videos to a single course.
/// </summary>
public class CreateVideosBatchDto
{
    /// <summary>
    /// The course ID that all videos in this batch belong to.
    /// </summary>
    public string CourseId { get; set; } = string.Empty;

    /// <summary>
    /// List of videos to create and upload.
    /// </summary>
    public List<CreateVideoDto> Videos { get; set; } = new();
}

/// <summary>
/// Response DTO for video creation/upload operations.
/// </summary>
public class VideoResponseDto
{
    /// <summary>
    /// The video's database ID.
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// The Bunny Stream video ID (GUID).
    /// </summary>
    public string BunnyVideoId { get; set; } = string.Empty;

    /// <summary>
    /// The course ID this video belongs to.
    /// </summary>
    public string CourseId { get; set; } = string.Empty;

    /// <summary>
    /// Video title.
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Video description.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Comma-separated tags.
    /// </summary>
    public string? Tags { get; set; }

    /// <summary>
    /// Video creation timestamp.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Sort order in the course.
    /// </summary>
    public int SortOrder { get; set; }
    public int AvailabilityDays { get; set; }
}
