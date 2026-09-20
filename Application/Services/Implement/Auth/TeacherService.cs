using EduSphare.Application.DTOs.Auth.Teacher;
using EduSphare.Application.Services.Interface.Auth;
using EduSphare.Domain.Entities.Users;
using EduSphare.Infrastructure.UnitOfWork;
using AutoMapper;
using Microsoft.AspNetCore.Identity;

namespace EduSphare.Application.Services.Implement.Auth
{
    public class TeacherService(
        IUnitOfWork uow,
        UserManager<ApplicationUser> userManager,
        IMapper mapper) : ITeacher
    {
        private static readonly string[] TeacherListRelations = ["ApplicationUser", "School", "TeacherStages.Stage"];
        private static readonly string[] TeacherDetailsRelations = ["ApplicationUser", "School", "TeacherStages.Stage", "Courses.Videos", "Courses.StudentCoursePaids"];

        public async Task<TeacherDetailsDto?> AddTeacher(TeacherDto teacherDto)
        {
            if (await userManager.FindByEmailAsync(teacherDto.Email) is not null)
                return null;

            var user = mapper.Map<ApplicationUser>(teacherDto);
            user.CreatedAt = DateTime.UtcNow;

            var createResult = await userManager.CreateAsync(user, teacherDto.Password);
            if (!createResult.Succeeded)
                return null;

            var teacher = mapper.Map<Teacher>(teacherDto);
            teacher.ApplicationUserId = user.Id;
            teacher.SchoolId = teacherDto.SchoolId;

            if (teacherDto.StageIds != null && teacherDto.StageIds.Any())
            {
                foreach (var stageId in teacherDto.StageIds.Distinct())
                {
                    teacher.TeacherStages.Add(new TeacherStage(user.Id, stageId));
                }
            }

            uow.Teachers.Add(teacher);
            await uow.SaveChangesAsync();

            return await GetTeacherById(user.Id);
        }

        public async Task<bool> RemoveTeacher(string id)
        {
            var teacher = await uow.Teachers.GetByQueryIncludingAsync(
                t => t.ApplicationUserId == id,
                "ApplicationUser");

            if (teacher?.ApplicationUser is null || teacher.ApplicationUser.IsDeleted)
                return false;

            teacher.ApplicationUser.DeleteUser();
            uow.Users.Update(teacher.ApplicationUser);
            await uow.SaveChangesAsync();
            return true;
        }

        public async Task<TeacherDetailsDto?> GetTeacherById(string id)
        {
            var teacher = await uow.Teachers.GetByQueryIncludingAsync(
                t => t.ApplicationUserId == id && !t.ApplicationUser.IsDeleted,
                TeacherDetailsRelations);

            if (teacher is null) return null;

            var dto = mapper.Map<TeacherDetailsDto>(teacher);
            dto.SchoolId = teacher.SchoolId;
            dto.SchoolName = teacher.School?.Name;
            dto.Stages = teacher.TeacherStages?
                .Where(ts => ts.Stage != null)
                .Select(ts => new TeacherStageDto { Id = ts.StageId, Name = ts.Stage!.Name })
                .ToList() ?? new List<TeacherStageDto>();

            return dto;
        }

        public async Task<IEnumerable<TeacherDetailsDto>> GetAllTeachers()
        {
            var teachers = await uow.Teachers.GetAllIncludingAsync(TeacherListRelations);
            return mapper.Map<IEnumerable<TeacherDetailsDto>>(
                teachers.Where(t => !t.ApplicationUser.IsDeleted));
        }
    }
}
