using EduSphare.Application.DTOs.Verification;
using EduSphare.Application.Services.Interface.Auth;
using EduSphare.Application.Services.Interface.Verification;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace EduSphare.Web.Controllers.API;

[Route("api/[controller]")]
[ApiController]
public class AccountController(IStudent student,
    IConfiguration configuration,
    IPhoneNumber _phoneNumber) : ControllerBase
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


    [HttpPost("send-otp")]
    public async Task<IActionResult> Send(string Phone)
    {
        try
        {
            var Message = await _phoneNumber.SendVerificationCodeAsync(Phone);
            return Ok(new { message = Message });
        }
        catch (Exception e)
        {
            // Avoid returning the exception object directly (can cause serialization issues).
            return StatusCode(500, new { message = e.Message });
        }
    }

    [HttpPost("verify-otp")]
    public async Task<IActionResult> Verify([FromBody] VerifyOtpDto dto)
    {
        // User may be anonymous during testing; FindFirstValue can return null.
        var studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        try
        {
            var ok = await _phoneNumber.VerifyCodeAsync(studentId, dto.Phone, dto.Code);
            return ok ? Ok(new { message = "Code verified." }) : BadRequest(new { message = "Invalid or expired code." });
        }
        catch (BadHttpRequestException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (ArgumentNullException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

}

