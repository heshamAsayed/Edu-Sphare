using System.Linq.Expressions;
using EduSphare.Application.DTOs.Reports;
using EduSphare.Application.Services.Interface.Reports;
using EduSphare.Domain.Entities;
using EduSphare.Infrastructure.UnitOfWork;

namespace EduSphare.Application.Services.Implement.Reports;

public class FinancialReportService(IUnitOfWork uow) : IFinancialReportService
{
    private static readonly string[] EnrollmentRelations =
        ["Student.ApplicationUser", "Teacher.ApplicationUser", "Course"];

    public async Task<FinancialReportDto> GetReportAsync(PaymentReportFilterDto filter)
    {
        var enrollments = await LoadEnrollmentsAsync(filter);
        var items = enrollments.Select(MapToItem).OrderByDescending(i => i.PaidAt).ToList();

        return new FinancialReportDto
        {
            Filters = filter,
            Summary = BuildSummary(items),
            Items = items,
            ByTeacher = BuildTeacherSummaries(items),
            ByCourse = BuildCourseSummaries(items),
            ByStudent = BuildStudentSummaries(items)
        };
    }

    public async Task<byte[]> GeneratePdfAsync(PaymentReportFilterDto filter)
    {
        var report = await GetReportAsync(filter);
        return FinancialReportPdfGenerator.Generate(report);
    }

    private async Task<IReadOnlyList<StudentCoursePaid>> LoadEnrollmentsAsync(PaymentReportFilterDto filter)
    {
        var predicate = BuildPredicate(filter);
        return await uow.Enrollments.GetManyByQueryIncludingAsync(predicate, EnrollmentRelations);
    }

    private static Expression<Func<StudentCoursePaid, bool>> BuildPredicate(PaymentReportFilterDto filter)
    {
        var studentId = filter.StudentId?.Trim();
        var teacherId = filter.TeacherId?.Trim();
        var teacherName = filter.TeacherName?.Trim().ToLower();
        var teacherEmail = filter.TeacherEmail?.Trim().ToLower();
        var courseId = filter.CourseId?.Trim();
        var courseName = filter.CourseName?.Trim().ToLower();
        var fromDate = filter.FromDate?.Date;
        var toDate = filter.ToDate?.Date;

        return e =>
            (string.IsNullOrWhiteSpace(studentId) || e.StudentId == studentId) &&
            (string.IsNullOrWhiteSpace(teacherId) || e.TeacherId == teacherId) &&
            (string.IsNullOrWhiteSpace(teacherName) ||
             (e.Teacher != null &&
              e.Teacher.ApplicationUser != null &&
              e.Teacher.ApplicationUser.Name.ToLower().Contains(teacherName))) &&
            (string.IsNullOrWhiteSpace(teacherEmail) ||
             (e.Teacher != null &&
              e.Teacher.ApplicationUser != null &&
              e.Teacher.ApplicationUser.Email != null &&
              e.Teacher.ApplicationUser.Email.ToLower() == teacherEmail)) &&
            (string.IsNullOrWhiteSpace(courseId) || e.CourseId == courseId) &&
            (string.IsNullOrWhiteSpace(courseName) ||
             (e.Course != null && e.Course.Name.ToLower().Contains(courseName))) &&
            (!fromDate.HasValue || e.PaidAt >= fromDate.Value) &&
            (!toDate.HasValue || e.PaidAt.Date <= toDate.Value);
    }

    private static PaymentReportItemDto MapToItem(StudentCoursePaid enrollment) => new()
    {
        Id = enrollment.Id,
        StudentId = enrollment.StudentId,
        StudentName = enrollment.Student?.ApplicationUser?.Name ?? "—",
        TeacherId = enrollment.TeacherId,
        TeacherName = enrollment.Teacher?.ApplicationUser?.Name ?? "—",
        TeacherEmail = enrollment.Teacher?.ApplicationUser?.Email ?? string.Empty,
        CourseId = enrollment.CourseId,
        CourseName = enrollment.Course?.Name ?? "—",
        Price = enrollment.Price,
        PaidAt = enrollment.PaidAt,
        PaymentMethod = enrollment.PaymentMethod,
        CodePaid = enrollment.CodePaid
    };

    private static PaymentReportSummaryDto BuildSummary(IReadOnlyList<PaymentReportItemDto> items) => new()
    {
        TotalPayments = items.Count,
        TotalAmount = items.Sum(i => i.Price),
        UniqueStudents = items.Select(i => i.StudentId).Distinct().Count(),
        UniqueCourses = items.Select(i => i.CourseId).Distinct().Count(),
        UniqueTeachers = items.Select(i => i.TeacherId).Distinct().Count()
    };

    private static List<CoursePaymentSummaryDto> BuildCourseSummaries(IReadOnlyList<PaymentReportItemDto> items) =>
        items.GroupBy(i => new { i.CourseId, i.CourseName })
            .Select(g => new CoursePaymentSummaryDto
            {
                CourseId = g.Key.CourseId,
                CourseName = g.Key.CourseName,
                StudentsCount = g.Select(x => x.StudentId).Distinct().Count(),
                PaymentsCount = g.Count(),
                Price = g.Select(x => x.Price).FirstOrDefault(),
                TotalAmount = g.Sum(x => x.Price)
            })
            .OrderByDescending(c => c.TotalAmount)
            .ToList();

    private static List<TeacherPaymentSummaryDto> BuildTeacherSummaries(IReadOnlyList<PaymentReportItemDto> items) =>
        items.GroupBy(i => new { i.TeacherId, i.TeacherName })
            .Select(g =>
            {
                var teacherItems = g.ToList();
                return new TeacherPaymentSummaryDto
                {
                    TeacherId = g.Key.TeacherId,
                    TeacherName = g.Key.TeacherName,
                    TeacherEmail = teacherItems.FirstOrDefault()?.TeacherEmail ?? string.Empty,
                    PaymentsCount = teacherItems.Count,
                    CoursesCount = teacherItems.Select(x => x.CourseId).Distinct().Count(),
                    StudentsCount = teacherItems.Select(x => x.StudentId).Distinct().Count(),
                    TotalAmount = teacherItems.Sum(x => x.Price),
                    Courses = teacherItems
                        .GroupBy(x => new { x.CourseId, x.CourseName })
                        .Select(cg => new CoursePaymentSummaryDto
                        {
                            CourseId = cg.Key.CourseId,
                            CourseName = cg.Key.CourseName,
                            StudentsCount = cg.Select(x => x.StudentId).Distinct().Count(),
                            PaymentsCount = cg.Count(),
                            Price = cg.Select(x => x.Price).FirstOrDefault(),
                            TotalAmount = cg.Sum(x => x.Price)
                        })
                        .OrderByDescending(c => c.TotalAmount)
                        .ToList()
                };
            })
            .OrderByDescending(t => t.TotalAmount)
            .ToList();

    private static List<StudentPaymentSummaryDto> BuildStudentSummaries(IReadOnlyList<PaymentReportItemDto> items) =>
        items.GroupBy(i => new { i.StudentId, i.StudentName })
            .Select(g =>
            {
                var studentItems = g.ToList();
                return new StudentPaymentSummaryDto
                {
                    StudentId = g.Key.StudentId,
                    StudentName = g.Key.StudentName,
                    PaymentsCount = studentItems.Count,
                    CoursesCount = studentItems.Select(x => x.CourseId).Distinct().Count(),
                    TotalAmount = studentItems.Sum(x => x.Price),
                    Courses = studentItems
                        .GroupBy(x => new { x.CourseId, x.CourseName })
                        .Select(cg => new CoursePaymentSummaryDto
                        {
                            CourseId = cg.Key.CourseId,
                            CourseName = cg.Key.CourseName,
                            StudentsCount = 1,
                            PaymentsCount = cg.Count(),
                            Price = cg.Select(x => x.Price).FirstOrDefault(),
                            TotalAmount = cg.Sum(x => x.Price)
                        })
                        .OrderByDescending(c => c.TotalAmount)
                        .ToList()
                };
            })
            .OrderByDescending(s => s.TotalAmount)
            .ToList();
}
