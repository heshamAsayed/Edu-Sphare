using EduSphare.Application.Services.Interface.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace EduSphare.Web.Controllers.API;

[Route("api/[controller]")]
[ApiController]
public class AccountController(IStudent student, IConfiguration configuration) : ControllerBase
{
    private string CookieName => configuration["Jwt:CookieName"] ?? "EduSphare.AccessToken";
    private int ExpireDays => int.TryParse(configuration["Jwt:ExpireDays"], out var days) ? days : 7;

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register(
        [FromBody] EduSphare.Application.DTOs.Auth.Student.RegisterSTDDto registerDto)
    {
        var response = await student.RegisterAsync(registerDto);
        if (!response.IsSuccess)
            return Conflict(response);

        return CreatedAtAction(nameof(Register), new { id = response.Id }, response);
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login(
        [FromBody] EduSphare.Application.DTOs.Auth.Student.LoginSTDDto loginDto)
    {
        var response = await student.LoginAsync(loginDto);
        if (string.IsNullOrWhiteSpace(response.Token))
            return Unauthorized(response);

        var useSecureCookie = Request.IsHttps;
        Response.Cookies.Append(CookieName, response.Token, new CookieOptions
        {
            HttpOnly = true,
            // Local HTTP development cannot persist a Secure/SameSite=None cookie.
            // Production HTTPS keeps the cross-origin-safe cookie settings.
            Secure = useSecureCookie,
            SameSite = useSecureCookie ? SameSiteMode.None : SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddDays(ExpireDays),
            IsEssential = true,
            Path = "/"
        });

        return Ok(response);
    }

    [Authorize]
    [HttpPost("logout")]
    public IActionResult Logout()
    {
        Response.Cookies.Delete(CookieName, new CookieOptions
        {
            Path = "/",
            Secure = Request.IsHttps,
            SameSite = Request.IsHttps ? SameSiteMode.None : SameSiteMode.Lax,
            HttpOnly = true
        });
        return Ok(new { message = "Logged out." });
    }

    [AllowAnonymous]
    [HttpGet("students")]
    public async Task<IActionResult> GetAllStudents() =>
        Ok(await student.GetAllStudentsAsync());

    /// <summary>Current student + paid courses. Auth via Bearer header or HttpOnly JWT cookie.</summary>
    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentStudent()
    {
        var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(studentId))
            return Unauthorized();

        var currentStudent = await student.GetStudentByIdAsync(studentId);
        return currentStudent is null
            ? NotFound(new { message = "Student not found." })
            : Ok(currentStudent);
    }
}
