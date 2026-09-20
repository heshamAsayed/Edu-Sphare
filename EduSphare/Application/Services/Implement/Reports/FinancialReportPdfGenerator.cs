using EduSphare.Application.DTOs.Reports;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace EduSphare.Application.Services.Implement.Reports;

internal static class FinancialReportPdfGenerator
{
    static FinancialReportPdfGenerator()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public static byte[] Generate(FinancialReportDto report)
    {
        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Margin(30);
                page.Size(PageSizes.A4);
                page.DefaultTextStyle(x => x.FontSize(10));

                page.Header().Column(column =>
                {
                    column.Item().Text("EduSphare - Financial Report").Bold().FontSize(16);
                    column.Item().Text($"Generated: {DateTime.Now:yyyy-MM-dd HH:mm}").FontSize(9).FontColor(Colors.Grey.Darken1);
                    column.Item().PaddingTop(6).Text(BuildFilterLine(report.Filters)).FontSize(9);
                });

                page.Content().PaddingVertical(12).Column(column =>
                {
                    column.Item().Element(c => RenderSummary(c, report.Summary));
                    column.Item().PaddingTop(16).Element(c => RenderCourseSummary(c, report.ByCourse));
                    column.Item().PaddingTop(16).Element(c => RenderTeacherSummary(c, report.ByTeacher));
                });

                page.Footer().AlignCenter().Text(text =>
                {
                    text.Span("Page ");
                    text.CurrentPageNumber();
                    text.Span(" / ");
                    text.TotalPages();
                });
            });
        });

        return document.GeneratePdf();
    }

    private static string BuildFilterLine(PaymentReportFilterDto filter)
    {
        var parts = new List<string>();
        if (!string.IsNullOrWhiteSpace(filter.StudentId)) parts.Add($"Student: {filter.StudentId}");
        if (!string.IsNullOrWhiteSpace(filter.TeacherId)) parts.Add($"TeacherId: {filter.TeacherId}");
        if (!string.IsNullOrWhiteSpace(filter.TeacherName)) parts.Add($"TeacherName: {filter.TeacherName}");
        if (!string.IsNullOrWhiteSpace(filter.TeacherEmail)) parts.Add($"TeacherEmail: {filter.TeacherEmail}");
        if (!string.IsNullOrWhiteSpace(filter.CourseId)) parts.Add($"CourseId: {filter.CourseId}");
        if (!string.IsNullOrWhiteSpace(filter.CourseName)) parts.Add($"CourseName: {filter.CourseName}");
        if (filter.FromDate.HasValue) parts.Add($"From: {filter.FromDate:yyyy-MM-dd}");
        if (filter.ToDate.HasValue) parts.Add($"To: {filter.ToDate:yyyy-MM-dd}");

        return parts.Count == 0 ? "Filters: All records" : "Filters: " + string.Join(" | ", parts);
    }

    private static void RenderSummary(IContainer container, PaymentReportSummaryDto summary)
    {
        container.Border(1).BorderColor(Colors.Grey.Lighten2).Padding(10).Column(column =>
        {
            column.Item().Text("Summary").Bold().FontSize(12);
            column.Item().PaddingTop(6).Row(row =>
            {
                row.RelativeItem().Text($"Payments: {summary.TotalPayments}");
                row.RelativeItem().Text($"Total: {summary.TotalAmount:N2}");
                row.RelativeItem().Text($"Students: {summary.UniqueStudents}");
                row.RelativeItem().Text($"Courses: {summary.UniqueCourses}");
                row.RelativeItem().Text($"Teachers: {summary.UniqueTeachers}");
            });
        });
    }

    private static void RenderCourseSummary(IContainer container, ICollection<CoursePaymentSummaryDto> courses)
    {
        container.Column(column =>
        {
            column.Item().Text("Courses").Bold().FontSize(12);
            column.Item().PaddingTop(6).Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.RelativeColumn(1);
                    columns.RelativeColumn(1.2f);
                    columns.RelativeColumn(1.4f);
                    columns.RelativeColumn(1.4f);
                });

                table.Header(header =>
                {
                    header.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Course").Bold();
                    header.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Students").Bold();
                    header.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Course price").Bold();
                    header.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Total").Bold();
                });

                foreach (var course in courses.OrderByDescending(i => i.TotalAmount))
                {
                    table.Cell().Padding(4).Text(course.CourseName);
                    table.Cell().Padding(4).Text(course.StudentsCount.ToString());
                    table.Cell().Padding(4).Text(course.Price.ToString("N2"));
                    table.Cell().Padding(4).Text(course.TotalAmount.ToString("N2"));
                }
            });
        });
    }

    private static void RenderTeacherSummary(IContainer container, ICollection<TeacherPaymentSummaryDto> byTeacher)
    {
        if (byTeacher.Count == 0) return;

        container.Column(column =>
        {
            column.Item().Text("Teacher total").Bold().FontSize(12);
            column.Item().PaddingTop(6).Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.RelativeColumn(2);
                    columns.RelativeColumn(2);
                    columns.RelativeColumn(1);
                    columns.RelativeColumn(1);
                    columns.RelativeColumn(1);
                    columns.RelativeColumn(1);
                });

                table.Header(header =>
                {
                    header.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Teacher").Bold();
                    header.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Email").Bold();
                    header.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Courses").Bold();
                    header.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Students").Bold();
                    header.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Payments").Bold();
                    header.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Total").Bold();
                });

                foreach (var teacher in byTeacher.OrderByDescending(t => t.TotalAmount))
                {
                    table.Cell().Padding(4).Text(teacher.TeacherName);
                    table.Cell().Padding(4).Text(teacher.TeacherEmail);
                    table.Cell().Padding(4).Text(teacher.CoursesCount.ToString());
                    table.Cell().Padding(4).Text(teacher.StudentsCount.ToString());
                    table.Cell().Padding(4).Text(teacher.PaymentsCount.ToString());
                    table.Cell().Padding(4).Text(teacher.TotalAmount.ToString("N2"));
                }
            });
        });
    }
}
