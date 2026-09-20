using EduSphare.Application.DTOs.Auth.Student;

namespace EduSphare.Application.Services.Interface.Auth
{
    public interface IStudent
    {
        Task<RegisterSTDDtoResponse> RegisterAsync(RegisterSTDDto registerDto);
        Task<AuthResponseDto> LoginAsync(LoginSTDDto loginDto);
        Task<IEnumerable<StudentDetailsDto>> GetAllStudentsAsync();
        Task<StudentDetailsDto?> GetStudentByIdAsync(string studentId);
    }
}
