using EduSphare.Application.DTOs.Auth.Teacher;
using EduSphare.Application.DTOs.SiteStructure;
using EduSphare.Application.Services.Interface.Auth;
using EduSphare.Application.Services.Interface.Courses;
using EduSphare.Application.Services.Interface.SiteStructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using System.IO;
using System.Security.Claims;

namespace EduSphare.Web.Controllers.API
{
    [Route("api/[controller]")]
    [ApiController]
    // [Authorize]
    public class DashboardController(ITeacher teacher, IStructureService structureService, ICourses courses) : ControllerBase
    {
        [HttpPost("AddTeacher")]
        public async Task<IActionResult> AddTeacher([FromBody] TeacherDto teacherDto)
        {
            var result = await teacher.AddTeacher(teacherDto);
            if (result is null)
                return Conflict(new { message = "A teacher with this email already exists, or the teacher could not be created." });

            return CreatedAtAction(nameof(GetCurrentTeacher), result);
        }

        [HttpDelete("RemoveTeacher/{id}")]
        public async Task<IActionResult> RemoveTeacher(string id)
        {
            var removed = await teacher.RemoveTeacher(id);
            return removed
                ? NoContent()
                : NotFound(new { message = "Teacher not found or has already been deleted." });
        }

        [HttpGet("GetAllTeachers")]
        public async Task<IActionResult> GetAllTeachers()
        {
            var teachers = await teacher.GetAllTeachers();
            return Ok(teachers);
        }

        [HttpGet("Teacher")]
        public async Task<IActionResult> GetCurrentTeacher()
        {
            var teacherId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(teacherId)) return Unauthorized();

            var result = await teacher.GetTeacherById(teacherId);
            return result is null
                ? NotFound(new { message = "Teacher not found." })
                : Ok(result);
        }

        [HttpGet("Teacher/Courses")]
        public async Task<IActionResult> GetCurrentTeacherCourses()
        {
            var teacherId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(teacherId)) return Unauthorized();

            var result = await courses.GetCoursesByInstructorId(teacherId);
            return Ok(result);
        }

        [HttpPost("AddSchool")]
        public async Task<IActionResult> AddSchool([FromForm] SchoolDto schoolDto, IFormFile? image)
        {
            // If an image file was uploaded, save it to wwwroot/IMAGES and set the ImagePath on DTO
            if (image is not null && image.Length > 0)
            {
                // Save images under wwwroot/resources/images
                var imagesFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "resources", "images");
                if (!Directory.Exists(imagesFolder))
                    Directory.CreateDirectory(imagesFolder);

                var ext = Path.GetExtension(image.FileName);
                var fileName = $"{Guid.NewGuid()}{ext}";
                var filePath = Path.Combine(imagesFolder, fileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await image.CopyToAsync(stream);
                }

                // Store the relative path that can be served by the app (e.g. /resources/images/{fileName})
                schoolDto.ImagePath = $"/resources/images/{fileName}";
            }

            var result = await structureService.AddSchool(schoolDto);
            return result is null
                ? Conflict(new { message = "A school with this name already exists." })
                : Ok(result);
        }

        [HttpPost("AddStage")]
        public async Task<IActionResult> AddStage([FromBody] StageDto stageDto)
        {
            var result = await structureService.AddStage(stageDto);
            return result is null
                ? NotFound(new { message = "School not found, or this stage already exists." })
                : Ok(result);
        }

        [HttpPost("AddYear")]
        public async Task<IActionResult> AddYear([FromBody] YearDto yearDto)
        {
            var result = await structureService.AddYear(yearDto);
            return result is null
                ? NotFound(new { message = "Stage not found, or this year already exists." })
                : Ok(result);
        }

        [HttpGet("SchoolsWithStagesAndYears")]
        public async Task<IActionResult> GetSchoolsWithStagesAndYears()
        {
            return Ok(await structureService.GetSchoolsWithStages());
        }

        [HttpGet("StagesWithYears")]
        public async Task<IActionResult> GetStagesWithYears()
        {
            return Ok(await structureService.GetStagesWithYears());
        }

        [HttpGet("YearsWithCourses")]
        public async Task<IActionResult> GetYearsWithCourses()
        {
            return Ok(await structureService.GetYearsWithCourses());
        }

    }
}
