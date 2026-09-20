namespace EduSphare.Application.DTOs.Auth.Teacher
{
    public class TeacherDetailsDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string? SchoolId { get; set; }
        public string? SchoolName { get; set; }
        public List<TeacherStageDto> Stages { get; set; } = new();
        // Years associated with this teacher (optional)
        public List<string> YearIds { get; set; } = new();
        public DateTime CreatedAt { get; set; }
        public bool IsDeleted { get; set; }
        public DateTime? DeletedAt { get; set; }
        public int CoursesCount { get; set; }
        public ICollection<TeacherCourseDto> Courses { get; set; } = new List<TeacherCourseDto>();
    }

    public class TeacherStageDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
    }

    public class TeacherCourseDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public DateTime CreatedAt { get; set; }
        public string YearId { get; set; } = string.Empty;
        public string StageId { get; set; } = string.Empty;
        public int VideosCount { get; set; }
        public int PaidStudentsCount { get; set; }
    }
}
