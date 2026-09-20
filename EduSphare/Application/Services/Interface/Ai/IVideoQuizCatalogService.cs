using EduSphare.Application.DTOs.Ai;

namespace EduSphare.Application.Services.Interface.Ai
{
    public interface IVideoQuizCatalogService
    {
        Task<VideoQuizCatalogResponseDto> GetQuestionsByVideoAsync(string studentId, string videoId);
        Task<VideoQuizCatalogResponseDto> GetQuestionsByCourseAsync(string studentId, string courseId);
    }
}
