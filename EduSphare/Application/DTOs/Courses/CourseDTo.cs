namespace EduSphare.Application.DTOs.Courses;

public class CourseDTo
{
    public string Id { get; set; } = string.Empty;
    // Keep original Name/CreatedAt for existing views
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    // New frontend-friendly fields
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? SortOrder { get; set; }
    public string? ImagePath { get; set; }
    public decimal Price { get; set; }
    // Payment info is per-student; include IsPaid here as a convenience (caller can set based on student)
    public bool IsPaid { get; set; }
    public string? TeacherId { get; set; }
    public string? TeacherName { get; set; }
    public int? VideosCount { get; set; }
    public IReadOnlyCollection<VideoDTo>? Videos { get; set; } = null;
}
