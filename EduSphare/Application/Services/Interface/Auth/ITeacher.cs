using EduSphare.Application.DTOs.Auth.Student;
using EduSphare.Application.DTOs.Auth.Teacher;

namespace EduSphare.Application.Services.Interface.Auth
{
    public interface ITeacher
    {
        Task<TeacherDetailsDto?> AddTeacher(TeacherDto teacher);
        Task<bool> RemoveTeacher(string id);
        Task<TeacherDetailsDto?> GetTeacherById(string id);
        Task<IEnumerable<TeacherDetailsDto>> GetAllTeachers();

    }
}
