using System.Security.Claims;
using EduSphare.Application.DTOs.Courses;
using EduSphare.Application.Services.Interface.Ai;
using EduSphare.Application.Services.Interface.Auth;
using EduSphare.Application.Services.Interface.Courses;
using EduSphare.Application.Services.Interface.SiteStructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduSphare.Web.Controllers.API;

[ApiController]
[Route("api/[controller]")]
public class LearningController : ControllerBase
{
    private readonly ICourses _courses;
    private readonly IVideos _videos;
    private readonly ICurrentUserService _currentUserService;
    private readonly IStructureService _structureService;
    private readonly ITeacher _teacherService;
    private readonly IVideoAnalyticsService _videoAnalyticsService;

    public LearningController(
        ICourses courses,
        IVideos videos,
        ICurrentUserService currentUserService,
        IStructureService structureService,
        ITeacher teacherService,
        IVideoAnalyticsService videoAnalyticsService)
    {
        _courses = courses;
        _videos = videos;
        _currentUserService = currentUserService;
        _structureService = structureService;
        _teacherService = teacherService;
        _videoAnalyticsService = videoAnalyticsService;
    }

    private async Task<bool> IsTeacherAsync(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return false;

        if (User.IsInRole("Teacher"))
            return true;

        return await _teacherService.GetTeacherById(userId) is not null;
    }

    /// <summary>
    /// Gets course details, active video, videos list with watched status, and teacher stats.
    /// URL: GET /api/Learning/Lesson/{id}
    /// </summary>
    [Authorize]
    [HttpGet("Lesson/{id}")]
    public async Task<IActionResult> Lesson(string id)
    {
        var courseId = id?.Trim() ?? string.Empty;
        var userId = _currentUserService.UserId ?? string.Empty;

        if (string.IsNullOrWhiteSpace(courseId))
            return BadRequest(new { success = false, message = "Course ID is required." });

        CourseDTo? course;
        try
        {
            course = await _courses.GetCourseById(courseId);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { success = false, message = "Course not found." });
        }

        var isTeacher = await IsTeacherAsync(userId);
        if (isTeacher)
        {
            var isOwner = await _courses.IsCourseOwnedByTeacherAsync(courseId, userId);
            if (!isOwner)
                return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = "Course is restricted to its instructor." });
        }
        else
        {
            if (!await _courses.IsStudendPaidCourse(userId, courseId))
                return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = "Student has not paid for this course.", isRestricted = true, courseId });
        }

        try
        {
            var courseVideos = (await _videos.GetVideosByCourseId(courseId))
                .OrderBy(video => video.SortOrder)
                .ToList();

            if (!isTeacher)
            {
                foreach (var courseVideo in courseVideos)
                    courseVideo.IsWatched = (await _videos.GetVideoWatched(userId, courseVideo.Id))
                        .Any(video => video.IsWatched);
            }

            var teacherStatistics = isTeacher
                ? await _videoAnalyticsService.GetCourseVideoStatisticsAsync(courseId)
                : System.Linq.Enumerable.Empty<EduSphare.Application.DTOs.Courses.VideoTeacherStatisticsDto>();

            return Ok(new
            {
                course,
                videos = courseVideos,
                activeVideo = courseVideos.FirstOrDefault(),
                studentId = isTeacher ? null : userId,
                isTeacher,
                teacherStatistics
            });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { success = false, message = "Course not found." });
        }
    }

    /// <summary>
    /// Instructor dashboard: returns teacher's courses, teacher info, and permitted stages.
    /// URL: GET /api/Learning/ManageCourses
    /// </summary>
    [Authorize]
    [HttpGet("ManageCourses")]
    public async Task<IActionResult> ManageCourses()
    {
        var userId = _currentUserService.UserId ?? string.Empty;
        if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();
        if (!await IsTeacherAsync(userId)) return Forbid();

        var teacherInfo = await _teacherService.GetTeacherById(userId);
        var instructorCourses = (await _courses.GetCoursesByInstructorId(userId))
            .OrderByDescending(c => c.CreatedAt)
            .ToList();

        var allStages = (await _structureService.GetStagesWithYears()).ToList();
        var teacherStageIds = teacherInfo?.Stages?.Select(s => s.Id).ToHashSet() ?? new HashSet<string>();
        var teacherStages = string.IsNullOrWhiteSpace(teacherInfo?.SchoolId)
            ? []
            : allStages.Where(s => s.SchoolId == teacherInfo.SchoolId
                && (!teacherStageIds.Any() || teacherStageIds.Contains(s.Id))).ToList();

        return Ok(new
        {
            instructorId = userId,
            teacherSchoolId = teacherInfo?.SchoolId,
            teacherSchoolName = teacherInfo?.SchoolName,
            courses = instructorCourses,
            stages = teacherStages
        });
    }

    /// <summary>
    /// Instructor course content management: returns course details and ordered videos list.
    /// URL: GET /api/Learning/CourseContent/{courseId}
    /// </summary>
    [Authorize]
    [HttpGet("CourseContent/{courseId}")]
    public async Task<IActionResult> GetCourseContent(string courseId)
    {
        var userId = _currentUserService.UserId ?? string.Empty;
        if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();
        if (!await IsTeacherAsync(userId)) return Forbid();

        var isOwner = await _courses.IsCourseOwnedByTeacherAsync(courseId, userId);
        if (!isOwner) return Forbid();

        CourseDTo? course;
        try
        {
            course = await _courses.GetCourseById(courseId);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { success = false, message = "Course not found." });
        }

        var courseVideos = (await _videos.GetVideosByCourseId(courseId))
            .OrderBy(v => v.SortOrder)
            .ToList();

        var teacherInfo = await _teacherService.GetTeacherById(userId);

        return Ok(new
        {
            course,
            videos = courseVideos,
            teacherSchoolName = teacherInfo?.SchoolName
        });
    }

    /// <summary>
    /// Gets permitted stages and years for the authenticated teacher.
    /// URL: GET /api/Learning/TeacherStages
    /// </summary>
    [Authorize]
    [HttpGet("TeacherStages")]
    public async Task<IActionResult> GetTeacherStages()
    {
        var userId = _currentUserService.UserId ?? string.Empty;
        if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();
        if (!await IsTeacherAsync(userId)) return Forbid();

        var teacherInfo = await _teacherService.GetTeacherById(userId);
        var allStages = (await _structureService.GetStagesWithYears()).ToList();

        var teacherStageIds = teacherInfo?.Stages?.Select(s => s.Id).ToHashSet() ?? new HashSet<string>();
        var teacherStages = string.IsNullOrWhiteSpace(teacherInfo?.SchoolId)
            ? []
            : allStages.Where(s => s.SchoolId == teacherInfo.SchoolId
                && (!teacherStageIds.Any() || teacherStageIds.Contains(s.Id))).ToList();

        return Ok(new
        {
            teacherSchoolId = teacherInfo?.SchoolId,
            teacherSchoolName = teacherInfo?.SchoolName,
            stages = teacherStages
        });
    }

    /// <summary>
    /// Creates a new course under the authenticated teacher.
    /// URL: POST /api/Learning/CreateCourse
    /// </summary>
    [Authorize]
    [HttpPost("CreateCourse")]
    public async Task<IActionResult> CreateCourse([FromForm] CreateCourseDTo dto, IFormFile? image)
    {
        var userId = _currentUserService.UserId ?? string.Empty;
        if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();
        if (!await IsTeacherAsync(userId)) return Forbid();

        // Enforce instructor ID from token
        dto.InstructorId = userId;

        if (image is not null && image.Length > 0)
        {
            var allowedImageTypes = new[] { "image/jpeg", "image/png", "image/webp" };
            if (!allowedImageTypes.Contains(image.ContentType, StringComparer.OrdinalIgnoreCase))
                return BadRequest(new { success = false, message = "Course image must be a JPG, PNG, or WebP file." });

            if (image.Length > 2 * 1024 * 1024)
                return BadRequest(new { success = false, message = "Course image must be 2 MB or smaller." });

            var imagesFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "resources", "images");
            Directory.CreateDirectory(imagesFolder);
            var extension = Path.GetExtension(image.FileName);
            var fileName = $"{Guid.NewGuid()}{extension}";
            var filePath = Path.Combine(imagesFolder, fileName);

            await using var stream = new FileStream(filePath, FileMode.Create);
            await image.CopyToAsync(stream);
            dto.ImagePath = $"/resources/images/{fileName}";
        }

        var teacherInfo = await _teacherService.GetTeacherById(userId);
        var permittedStages = string.IsNullOrWhiteSpace(teacherInfo?.SchoolId)
            ? []
            : (await _structureService.GetStagesWithYears())
                .Where(s => s.SchoolId == teacherInfo.SchoolId
                    && (!(teacherInfo.Stages?.Any() ?? false) || teacherInfo.Stages.Any(ts => ts.Id == s.Id)))
                .ToList();

        var selectedStage = permittedStages.FirstOrDefault(s => s.Id == dto.StageId);
        if (selectedStage is null || !selectedStage.Years.Any(y => y.Id == dto.YearId))
            return BadRequest(new { success = false, message = "المرحلة أو السنة المختارة ليست متاحة ضمن مدرسة المدرس." });

        ModelState.Clear();
        TryValidateModel(dto);

        if (!ModelState.IsValid)
        {
            var errors = string.Join(" | ", ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage));
            return BadRequest(new { success = false, message = $"Invalid course data: {errors}" });
        }

        try
        {
            var courseId = await _courses.AddCourseAsync(dto);
            return Ok(new { success = true, courseId, id = courseId });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    public class MarkVideoWatchedRequest
    {
        public string? CourseId { get; set; }
        public string? VideoId { get; set; }
    }

    [Authorize]
    [HttpPost("MarkVideoWatched")]
    public async Task<IActionResult> MarkVideoWatched([FromBody] MarkVideoWatchedRequest req)
    {
        var userId = _currentUserService.UserId ?? string.Empty;

        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized(new { success = false, message = "User is not authenticated." });

        if (string.IsNullOrWhiteSpace(req?.VideoId))
            return BadRequest(new { success = false, message = "Video ID is required." });

        try
        {
            var result = await _videos.AddVideoAsWatched(userId, req.VideoId!);
            return Ok(new
            {
                success = true,
                videoId = result.VideoId,
                isWatched = result.IsWatched,
                watchedAt = result.WatchedAt,
                isAbsent = result.IsAbsent,
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[MarkVideoWatched] Error: {ex}");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [Authorize]
    [HttpGet("GetUploadProgress")]
    public IActionResult GetUploadProgress([FromQuery] string uploadId)
    {
        if (string.IsNullOrWhiteSpace(uploadId))
            return Ok(new { percent = 0, status = "InvalidId" });

        var progress = EduSphare.Application.Services.UploadProgressTracker.GetProgress(uploadId);
        if (progress == null)
            return Ok(new { percent = 0, status = "Starting" });

        return Ok(new
        {
            percent = progress.Percent,
            bytesUploaded = progress.BytesUploaded,
            totalBytes = progress.TotalBytes,
            status = progress.Status,
            errorMessage = progress.ErrorMessage
        });
    }

    [Authorize]
    [HttpGet("GetTranscriptionStatus")]
    public async Task<IActionResult> GetTranscriptionStatus([FromQuery] string videoId)
    {
        try
        {
            var status = await _videos.GetTranscriptionStatusAsync(videoId);
            return Ok(new { success = true, status = status.Status, errorMessage = status.ErrorMessage });
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [Authorize]
    [HttpGet("GetBackgroundProgress")]
    public IActionResult GetBackgroundProgress([FromQuery] string progressId)
    {
        var progress = EduSphare.Application.Services.UploadProgressTracker.GetProgress(progressId);
        if (progress is null)
            return Ok(new { percent = 0, status = "Starting" });
        return Ok(progress);
    }

    public class ReorderVideoRequest
    {
        public string? VideoId { get; set; }
        public int SortOrder { get; set; }
    }

    [Authorize]
    [HttpPost("ReorderVideo")]
    public async Task<IActionResult> ReorderVideo([FromBody] ReorderVideoRequest req)
    {
        var userId = _currentUserService.UserId ?? string.Empty;
        if (!await IsTeacherAsync(userId)) return Forbid();
        if (string.IsNullOrWhiteSpace(req?.VideoId)) return BadRequest(new { success = false, message = "Video ID is required." });

        try
        {
            await _videos.ReorderVideoAsync(req.VideoId, req.SortOrder);
            return Ok(new { success = true });
        }
        catch (Exception ex) when (ex is KeyNotFoundException or UnauthorizedAccessException or InvalidOperationException)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [Authorize]
    [HttpPost("UploadVideo")]
    [RequestSizeLimit(4_294_967_296)]
    [RequestFormLimits(MultipartBodyLengthLimit = 4_294_967_296)]
    public async Task<IActionResult> UploadVideo([FromQuery] string? courseId, [FromForm] CreateVideoDto dto, [FromQuery] string? uploadId = null)
    {
        var userId = _currentUserService.UserId ?? string.Empty;

        if (!await IsTeacherAsync(userId))
            return BadRequest(new { success = false, message = "Only teachers can upload videos." });

        var targetCourseId = !string.IsNullOrWhiteSpace(courseId) ? courseId : dto.CourseId;
        if (string.IsNullOrWhiteSpace(targetCourseId))
            return BadRequest(new { success = false, message = "Course ID is required." });

        try
        {
            var isOwner = await _courses.IsCourseOwnedByTeacherAsync(targetCourseId, userId);
            if (!isOwner)
            {
                return Forbid();
            }

            dto.CourseId = targetCourseId;
            var result = await _videos.CreateAndUploadVideoAsync(dto, uploadId);

            if (!string.IsNullOrWhiteSpace(uploadId))
                EduSphare.Application.Services.UploadProgressTracker.SetCompleted(uploadId);

            return Ok(new
            {
                success = true,
                message = "Video uploaded successfully.",
                videoId = result.Id,
                bunnyVideoId = result.BunnyVideoId,
                uploadProgress = 100
            });
        }
        catch (Exception ex)
        {
            var detail = ex.InnerException?.Message ?? ex.Message;
            if (!string.IsNullOrWhiteSpace(uploadId)) EduSphare.Application.Services.UploadProgressTracker.SetFailed(uploadId, detail);
            return StatusCode(500, new { success = false, message = detail });
        }
    }
}
