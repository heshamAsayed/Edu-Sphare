using EduSphare.Application.DTOs.Courses;

namespace EduSphare.Application.Services.Interface.Courses;

public interface IVideos
{
    // Reading operations
    Task<VideoDTo> GetVideoById(string videoId);
    Task<ICollection<VideoDTo>> GetVideosByCourseId(string courseId);
    Task<ICollection<VideoDTo>> GetVideoWatched(string studentId, string videoId);
    Task<VideoWatchResponseDto> AddVideoAsWatched(string studentId, string videoId);

    /// <summary>
    /// تسجيل ومراكمة نسبة عدم التركيز (FocusPercent) الخاصة بالطالب عند التأخير في إجابة أسئلة الانتباه بمعدل 10% لكل دقيقة تأخير.
    /// </summary>
    Task RecordAttentionPenaltyAsync(string studentId, string videoId, int responseTimeSeconds);

    // Upload operations (Bunny Stream integration)
    /// <summary>
    /// Creates and uploads a single video to a course.
    /// Verifies that the course belongs to the current teacher.
    /// </summary>
    Task<VideoResponseDto> CreateAndUploadVideoAsync(CreateVideoDto dto, string? uploadId = null);

    /// <summary>
    /// Creates and uploads multiple videos to a course in a batch.
    /// Verifies that the course belongs to the current teacher.
    /// </summary>
    Task<List<VideoResponseDto>> CreateAndUploadVideosAsync(CreateVideosBatchDto dto);

    /// <summary>
    /// Deletes a video from the course and removes it from Bunny Stream.
    /// Verifies that the course belongs to the current teacher.
    /// </summary>
    Task DeleteVideoAsync(string videoId);

    Task ReorderVideoAsync(string videoId, int targetSortOrder);
    Task<VideoTranscriptionStatusDto> GetTranscriptionStatusAsync(string videoId);
}
