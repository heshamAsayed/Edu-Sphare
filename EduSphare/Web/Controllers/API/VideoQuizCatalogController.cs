using EduSphare.Application.Services.Interface.Ai;
using EduSphare.Application.Services.Interface.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduSphare.Web.Controllers.API
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class VideoQuizCatalogController(
        IVideoQuizCatalogService catalogService,
        ICurrentUserService currentUserService) : ControllerBase
    {
        private string? StudentId => currentUserService.UserId;

    /// <summary>
    /// أسئلة فيديو واحد محدد
    /// GET /api/VideoQuizCatalog/video/{videoId}
    /// </summary>
    [HttpGet("video/{videoId}")]
    public async Task<IActionResult> GetByVideo(string videoId)
    {
        if (string.IsNullOrWhiteSpace(StudentId))
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(videoId))
            return BadRequest(new { message = "videoId مطلوب." });

        var result = await catalogService.GetQuestionsByVideoAsync(StudentId, videoId);

        if (result.TotalVideos == 0)
            return NotFound(new { success = false, message = "الفيديو غير موجود." });

        var v = result.Videos[0];
        return Ok(new
        {
            success      = true,
            videoId      = v.VideoId,
            title        = v.VideoTitle,
            sortOrder    = v.SortOrder,
            hasQuestions = v.HasQuestions,
            questions    = v.Questions
        });
    }

        /// <summary>
        /// أسئلة كل فيديوهات كورس محدد مرتبةً بالـ SortOrder
        /// GET /api/VideoQuizCatalog/course/{courseId}
        /// </summary>
        [HttpGet("course/{courseId}")]
        public async Task<IActionResult> GetByCourse(string courseId)
        {
            if (string.IsNullOrWhiteSpace(StudentId))
                return Unauthorized();

            if (string.IsNullOrWhiteSpace(courseId))
                return BadRequest(new { message = "courseId مطلوب." });

            var result = await catalogService.GetQuestionsByCourseAsync(StudentId, courseId);
            return Ok(new { success = true, data = result });
        }
    }
}
