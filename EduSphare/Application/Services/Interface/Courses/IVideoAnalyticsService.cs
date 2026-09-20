using EduSphare.Application.DTOs.Courses;

namespace EduSphare.Application.Services.Interface.Courses;

public interface IVideoAnalyticsService
{
    Task<IReadOnlyCollection<VideoTeacherStatisticsDto>> GetCourseVideoStatisticsAsync(string courseId);
}
