using EduSphare.Application.DTOs.Auth.Student;
using EduSphare.Application.Services.Interface.Auth;
using EduSphare.Domain.Entities.Users;
using EduSphare.Infrastructure.UnitOfWork;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace EduSphare.Application.Services.Implement.Auth;

public class StudnetService(
    IUnitOfWork uow,
    UserManager<ApplicationUser> userManager,
    AutoMapper.IMapper mapper,
    IConfiguration configuration) : IStudent
{
    public async Task<AuthResponseDto> LoginAsync(LoginSTDDto loginDto)
    {
        var user = await userManager.FindByEmailAsync(loginDto.Email);
        if (user is null || user.IsDeleted)
            return new AuthResponseDto { Message = "Invalid email or password.", Token = string.Empty };

        if (!await userManager.CheckPasswordAsync(user, loginDto.Password))
            return new AuthResponseDto { Message = "Invalid email or password.", Token = string.Empty };

        return new AuthResponseDto
        {
            Token = await GenerateTokenAsync(user),
            Message = "Login successful."
        };
    }

    public async Task<RegisterSTDDtoResponse> RegisterAsync(RegisterSTDDto registerDto)
    {
        var userExist = await userManager.FindByEmailAsync(registerDto.Email);
        if (userExist is not null && !userExist.IsDeleted)
            return new RegisterSTDDtoResponse { Message = "User already exists.", IsSuccess = false };

        return await uow.ExecuteInTransactionAsync(async () =>
        {
            var user = mapper.Map<ApplicationUser>(registerDto);
            user.CreatedAt = DateTime.UtcNow;

            var result = await userManager.CreateAsync(user, registerDto.Password);
            if (!result.Succeeded)
                return new RegisterSTDDtoResponse
            {
                Message = string.Join(", ", result.Errors.Select(x => x.Description)),
                IsSuccess = false
            };

            var student = mapper.Map<Student>(registerDto);
            student.ApplicationUserId = user.Id;
            student.JoinDate = DateTime.UtcNow;

            uow.Students.Add(student);
            await uow.SaveChangesAsync();

            var response = mapper.Map<RegisterSTDDtoResponse>(user);
            response.Message = "Student registered successfully.";
            response.IsSuccess = true;
            return response;
        });
    }

    public async Task<IEnumerable<StudentDetailsDto>> GetAllStudentsAsync()
    {
        var students = await uow.Students.GetAllIncludingAsync(
            "ApplicationUser",
            "StudentCoursePaids.Course");

        return mapper.Map<IEnumerable<StudentDetailsDto>>(
            students.Where(student => !student.ApplicationUser.IsDeleted));
    }

    public async Task<StudentDetailsDto?> GetStudentByIdAsync(string studentId)
    {
        // 1) Student + user only (no enrollment join explosion)
        var student = await uow.Students.GetByQueryIncludingAsync(
            item => item.ApplicationUserId == studentId,
            "ApplicationUser");

        if (student is null || student.ApplicationUser.IsDeleted)
            return null;

        // 2) Paid courses filtered in SQL via Enrollments repo (StudentCoursePaids)
        var enrollments = await uow.Enrollments.GetManyByQueryIncludingAsync(
            e => e.StudentId == studentId,
            "Course");

        // Keep one row per course if seed data created duplicates
        var uniquePaid = enrollments
            .Where(e => e.Course is not null)
            .GroupBy(e => e.CourseId)
            .Select(g => g.OrderByDescending(e => e.PaidAt).First())
            .OrderByDescending(e => e.PaidAt)
            .ToList();

        var dto = mapper.Map<StudentDetailsDto>(student);
        dto.PaidCourses = mapper.Map<List<PaidCourseDto>>(uniquePaid);
        return dto;
    }

    private async Task<string> GenerateTokenAsync(ApplicationUser user)
    {
        var expireDays = int.TryParse(configuration["Jwt:ExpireDays"], out var days) ? days : 7;

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Name, user.UserName ?? user.Email ?? user.Id),
            new(ClaimTypes.Email, user.Email ?? string.Empty)
        };

        // Roles come from profile tables (Teachers / Students), not AspNetRoles
        var isTeacher = await uow.Teachers.AnyAsync(t => t.ApplicationUserId == user.Id);
        var isStudent = await uow.Students.AnyAsync(s => s.ApplicationUserId == user.Id);

        if (isTeacher)
            claims.Add(new Claim(ClaimTypes.Role, "Teacher"));
        if (isStudent)
            claims.Add(new Claim(ClaimTypes.Role, "Student"));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration["Jwt:Key"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: configuration["Jwt:Issuer"],
            audience: configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddDays(expireDays),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
