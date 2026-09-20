namespace EduSphare.Application.DTOs.Reports;

public class PaymentReportFilterDto
{
    public string? StudentId { get; set; }
    public string? TeacherId { get; set; }
    public string? TeacherName { get; set; }
    public string? TeacherEmail { get; set; }
    public string? CourseId { get; set; }
    public string? CourseName { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
}

public class PaymentReportItemDto
{
    public string Id { get; set; } = string.Empty;
    public string StudentId { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public string TeacherId { get; set; } = string.Empty;
    public string TeacherName { get; set; } = string.Empty;
    public string TeacherEmail { get; set; } = string.Empty;
    public string CourseId { get; set; } = string.Empty;
    public string CourseName { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public DateTime PaidAt { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public string CodePaid { get; set; } = string.Empty;
}

public class CoursePaymentSummaryDto
{
    public string CourseId { get; set; } = string.Empty;
    public string CourseName { get; set; } = string.Empty;
    public int StudentsCount { get; set; }
    public int PaymentsCount { get; set; }
    public decimal Price { get; set; }
    public decimal TotalAmount { get; set; }
}

public class TeacherPaymentSummaryDto
{
    public string TeacherId { get; set; } = string.Empty;
    public string TeacherName { get; set; } = string.Empty;
    public string TeacherEmail { get; set; } = string.Empty;
    public int PaymentsCount { get; set; }
    public int CoursesCount { get; set; }
    public int StudentsCount { get; set; }
    public decimal TotalAmount { get; set; }
    public ICollection<CoursePaymentSummaryDto> Courses { get; set; } = [];
}

public class StudentPaymentSummaryDto
{
    public string StudentId { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public int CoursesCount { get; set; }
    public int PaymentsCount { get; set; }
    public decimal TotalAmount { get; set; }
    public ICollection<CoursePaymentSummaryDto> Courses { get; set; } = [];
}

public class PaymentReportSummaryDto
{
    public int TotalPayments { get; set; }
    public decimal TotalAmount { get; set; }
    public int UniqueStudents { get; set; }
    public int UniqueCourses { get; set; }
    public int UniqueTeachers { get; set; }
}

public class FinancialReportDto
{
    public PaymentReportFilterDto Filters { get; set; } = new();
    public PaymentReportSummaryDto Summary { get; set; } = new();
    public ICollection<PaymentReportItemDto> Items { get; set; } = [];
    public ICollection<TeacherPaymentSummaryDto> ByTeacher { get; set; } = [];
    public ICollection<CoursePaymentSummaryDto> ByCourse { get; set; } = [];
    public ICollection<StudentPaymentSummaryDto> ByStudent { get; set; } = [];
}
