using EduSphare.Application.DTOs.Courses;
using EduSphare.Application.Services.Interface.Courses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduSphare.Web.Controllers.API;

/// <summary>
/// API controller for managing video uploads to courses.
/// Requires Teacher authentication for upload/delete operations.
/// </summary>
[Route("api/[controller]")]
[ApiController]
[Authorize]
public class VideosController : ControllerBase
{
    private readonly IVideos _videoService;
    private readonly ILogger<VideosController> _logger;

    public VideosController(
        IVideos videoService,
        ILogger<VideosController> logger)
    {
        _videoService = videoService;
        _logger = logger;
    }

    /// <summary>
    /// Uploads a single video to a course.
    /// Teacher must own the course.
    /// </summary>
    [HttpPost("upload")]
    [RequestSizeLimit(4_294_967_296)] // 4GB
    [RequestFormLimits(MultipartBodyLengthLimit = 4_294_967_296)] // 4GB
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> UploadVideo([FromForm] CreateVideoDto dto)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(dto.CourseId))
                return BadRequest(new { message = "CourseId is required." });

            if (string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest(new { message = "Video title is required." });

            var result = await _videoService.CreateAndUploadVideoAsync(dto);

            // Transcription is queued inside VideosService after Bunny upload + DB save (Deepgram).

            return CreatedAtAction(nameof(UploadVideo), new { id = result.Id }, result);
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning($"Unauthorized video upload attempt: {ex.Message}");
            return Forbid();
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning($"Course not found: {ex.Message}");
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogError($"Failed to upload video: {ex.Message}");
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Unexpected error during video upload: {ex.Message}");
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred." });
        }
    }

    /// <summary>
    /// Uploads multiple videos to a course in a batch.
    /// Teacher must own the course.
    /// </summary>
    [HttpPost("upload-batch")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> UploadVideoBatch([FromForm] CreateVideosBatchDto dto)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(dto.CourseId))
                return BadRequest(new { message = "CourseId is required." });

            if (dto.Videos is null || dto.Videos.Count == 0)
                return BadRequest(new { message = "At least one video is required." });

            var result = await _videoService.CreateAndUploadVideosAsync(dto);

            // Transcription is queued inside VideosService after Bunny upload + DB save (Deepgram).

            return CreatedAtAction(nameof(UploadVideoBatch), result);
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning($"Unauthorized batch video upload attempt: {ex.Message}");
            return Forbid();
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning($"Course not found: {ex.Message}");
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogError($"Failed to upload videos: {ex.Message}");
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Unexpected error during batch video upload: {ex.Message}");
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred." });
        }
    }

    /// <summary>
    /// Retrieves videos for a course.
    /// Anyone can view videos (public endpoint).
    /// </summary>
    [AllowAnonymous]
    [HttpGet("course/{courseId}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetVideosByCourse(string courseId)
    {
        try
        {
            var videos = await _videoService.GetVideosByCourseId(courseId);
            return Ok(videos);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error retrieving videos for course {courseId}: {ex.Message}");
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An error occurred while retrieving videos." });
        }
    }

    /// <summary>
    /// Retrieves a specific video by ID.
    /// Anyone can view video details (public endpoint).
    /// </summary>
    [AllowAnonymous]
    [HttpGet("{videoId}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetVideo(string videoId)
    {
        try
        {
            var video = await _videoService.GetVideoById(videoId);
            return Ok(video);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error retrieving video {videoId}: {ex.Message}");
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An error occurred while retrieving the video." });
        }
    }

    /// <summary>
    /// Deletes a video from a course.
    /// Teacher must own the course.
    /// </summary>
    [HttpDelete("{videoId}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> DeleteVideo(string videoId)
    {
        try
        {
            await _videoService.DeleteVideoAsync(videoId);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning($"Unauthorized video deletion attempt: {ex.Message}");
            return Forbid();
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning($"Video not found: {ex.Message}");
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogError($"Failed to delete video: {ex.Message}");
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Unexpected error during video deletion: {ex.Message}");
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred." });
        }
    }
}
