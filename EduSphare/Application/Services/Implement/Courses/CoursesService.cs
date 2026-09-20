using EduSphare.Application.DTOs.Courses;
using EduSphare.Application.Services.Interface.Courses;
using EduSphare.Domain.Entities;
using EduSphare.Infrastructure.UnitOfWork;
using AutoMapper;
using System.Linq.Expressions;
using System.Linq;

namespace EduSphare.Application.Services.Implement.Courses;

public class CoursesService(IUnitOfWork uow, IMapper mapper) : ICourses
{
    private static readonly string[] CourseRelations = ["Videos", "StudentCoursePaids", "teachers.ApplicationUser"];

    public async Task<string> AddCourseAsync(CreateCourseDTo courseDTo)
    {
        var teacher = await uow.Teachers.GetByQueryIncludingAsync(t => t.ApplicationUserId == courseDTo.InstructorId, "Courses")
            ?? throw new KeyNotFoundException("Instructor was not found.");
        if (!await uow.Years.IsExist(courseDTo.YearId) || !await uow.Stages.IsExist(courseDTo.StageId))
            throw new KeyNotFoundException("Year or stage was not found.");

        var course = new Course(courseDTo.Name, DateTime.UtcNow, courseDTo.YearId, courseDTo.StageId, courseDTo.Price);
        course.ImagePath = courseDTo.ImagePath ?? string.Empty;
        course.Description = courseDTo.Description ?? string.Empty;
        course.SortOrder = courseDTo.SortOrder ?? 0;
        teacher.Courses ??= new List<Course>();
        teacher.Courses.Add(course);
        uow.Courses.Add(course);
        await uow.SaveChangesAsync();
        return course.Id;
    }

    public string AddCourse(CreateCourseDTo courseDTo) => AddCourseAsync(courseDTo).GetAwaiter().GetResult();

    public async Task UpdateCourseAsync(UpdateCourseDTo courseDTo)
    {
        var course = await uow.Courses.GetByIdAsync(courseDTo.Id)
            ?? throw new KeyNotFoundException("Course was not found.");
        if (!await uow.Years.IsExist(courseDTo.YearId) || !await uow.Stages.IsExist(courseDTo.StageId))
            throw new KeyNotFoundException("Year or stage was not found.");
        mapper.Map(courseDTo, course);
        uow.Courses.Update(course);
        await uow.SaveChangesAsync();
    }

    public void UpdateCourse(UpdateCourseDTo courseDTo) => UpdateCourseAsync(courseDTo).GetAwaiter().GetResult();

    public async Task<CourseDTo> GetCourseById(string courseId)
    {
        var course = await uow.Courses.GetByQueryIncludingAsync(c => c.Id == courseId, CourseRelations);
        return course is null ? throw new KeyNotFoundException("Course was not found.") : mapper.Map<CourseDTo>(course);
    }

    public async Task<ICollection<CourseDTo>> GetAllCourses() =>
        mapper.Map<List<CourseDTo>>(await uow.Courses.GetAllIncludingAsync(CourseRelations));

    public async Task<ICollection<CourseDTo>> GetCoursesByInstructorId(string instructorId)
    {
        var teacher = await uow.Teachers.GetByQueryIncludingAsync(
            t => t.ApplicationUserId == instructorId,
            "Courses.Videos",
            "Courses.StudentCoursePaids");
        return teacher?.Courses is null ? [] : mapper.Map<List<CourseDTo>>(teacher.Courses);
    }

    public async Task<ICollection<CourseDTo>> GetCoursesPaidByStudentId(string studentId)
    {
        var enrollments = await uow.Enrollments.GetManyByQueryIncludingAsync(
            e => e.StudentId == studentId,
            "Course.Videos");

        var courses = enrollments
            .Where(e => e.Course is not null)
            .GroupBy(e => e.CourseId)
            .Select(g => g.First().Course!)
            .ToList();

        return mapper.Map<List<CourseDTo>>(courses);
    }

    public async Task<bool> IsStudendPaidCourse(string studentId, string courseId) =>
        await uow.Enrollments.AnyAsync(e => e.StudentId == studentId && e.CourseId == courseId);

    /// <summary>
    /// Verifies that a course belongs to a specific teacher.
    /// </summary>
    public async Task<bool> IsCourseOwnedByTeacherAsync(string courseId, string teacherId)
    {
        var teacher = await uow.Teachers.GetByQueryIncludingAsync(
            t => t.ApplicationUserId == teacherId,
            "Courses");

        if (teacher?.Courses is null)
            return false;

        return teacher.Courses.Any(c => c.Id == courseId);
    }

    public async Task<ICollection<CourseDTo>> GetCoursesByYearAndStage(string schoolId, string stageId, string yearId)
    {
        // Allow empty/null parameters to act as wildcards
        Expression<Func<Course, bool>> predicate = c =>
            (string.IsNullOrWhiteSpace(yearId) || c.YearId == yearId)
            && (string.IsNullOrWhiteSpace(stageId) || c.StageId == stageId);

        // Include Stage so we can filter by SchoolId when needed, and include Videos for DTO
        var courses = await uow.Courses.GetManyByQueryIncludingAsync(predicate, "Stage", "Videos", "StudentCoursePaids", "teachers.ApplicationUser");

        // If schoolId supplied, filter by the related Stage.SchoolId
        var filtered = string.IsNullOrWhiteSpace(schoolId)
            ? courses
            : courses.Where(c => c.Stage != null && c.Stage.SchoolId == schoolId).ToList();

        return mapper.Map<List<CourseDTo>>(filtered);
    }
}
