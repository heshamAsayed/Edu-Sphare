namespace EduSphare.Application.DTOs.Auth.Student
{
    public class StudentDetailsDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public DateTime JoinDate { get; set; }
        public string SchoolId { get; set; } = string.Empty;
        public string StageId { get; set; } = string.Empty;
        public string YearId { get; set; } = string.Empty;
        public ICollection<PaidCourseDto> PaidCourses { get; set; } = new List<PaidCourseDto>();
    }

    public class PaidCourseDto
    {
        public string Id { get; set; } = string.Empty;
        public string CourseId { get; set; } = string.Empty;
        public string CourseName { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public DateTime PaidAt { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public string CodePaid { get; set; } = string.Empty;
        public string TeacherId { get; set; } = string.Empty;
    }
}
