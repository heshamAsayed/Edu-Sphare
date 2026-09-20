using System;

namespace EduSphare.Application.DTOs.Payment
{
    public class StudentCoursePaymentDto
    {
        public string StudentId { get; set; } = string.Empty;
        public string CourseId { get; set; } = string.Empty;
        public string InstructorId { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime PaymentDate { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public string CodePaid { get; set; } = string.Empty;
        public bool IsPaid { get; set; } = true;
    }
}
