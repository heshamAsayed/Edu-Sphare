using EduSphare.Application.DTOs.Courses;

namespace EduSphare.Application.Services.Interface.Courses;

public interface ICourses
{
    /// <summary>
    /// Creates a course for the instructor and returns the new course id.
    /// </summary>
    string AddCourse(CreateCourseDTo courseDTo);
    Task<string> AddCourseAsync(CreateCourseDTo courseDTo);
    void UpdateCourse(UpdateCourseDTo courseDTo);
    Task UpdateCourseAsync(UpdateCourseDTo courseDTo);
    Task<CourseDTo> GetCourseById(string courseId);
    Task<ICollection<CourseDTo>> GetAllCourses();
    Task<ICollection<CourseDTo>> GetCoursesByInstructorId(string instructorId);
    Task<ICollection<CourseDTo>> GetCoursesPaidByStudentId(string studentId);
    Task<ICollection<CourseDTo>> GetCoursesByYearAndStage(string schoolId, string stageId, string yearId);
    Task<bool> IsStudendPaidCourse(string studentId, string courseId);

    /// <summary>
    /// Verifies that a course belongs to a specific teacher.
    /// </summary>
    Task<bool> IsCourseOwnedByTeacherAsync(string courseId, string teacherId);
}
