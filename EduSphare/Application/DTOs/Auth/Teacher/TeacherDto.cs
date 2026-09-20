namespace EduSphare.Application.DTOs.Auth.Teacher
{
    public class TeacherDto
    {
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string? SchoolId { get; set; }
        public List<string> StageIds { get; set; } = new();
        // Optional list of YearIds the teacher is associated with
        public List<string> YearIds { get; set; } = new();
    }
}
