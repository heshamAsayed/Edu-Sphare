using EduSphare.Application.Services.Interface.Courses;
using EduSphare.Application.DTOs.Courses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduSphare.Web.Controllers.API;

[Route("api/[controller]")]
[ApiController]

public sealed class CoursesController(ICourses courses) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAllCourses() => Ok(await courses.GetAllCourses());



    [HttpGet("{id}")]
    public async Task<IActionResult> GetCourseById(string id)
    {
        try
        {
            return Ok(await courses.GetCourseById(id));
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Course not found." });
        }
    }
    [HttpGet("{schoolId}/{stageId}/{yearId}")]
    public async Task<IActionResult> GetCoursesByYear(string schoolId, string stageId, string yearId)
    {
        var result = await courses.GetCoursesByYearAndStage(schoolId, stageId, yearId);
        return Ok(result);
    }
}
