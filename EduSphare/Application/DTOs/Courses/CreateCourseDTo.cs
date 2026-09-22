using System.ComponentModel.DataAnnotations;
namespace EduSphare.Application.DTOs.Courses;
public class CreateCourseDTo
{
    [Required, StringLength(200)]
    public string Name { get; set; } = string.Empty;

    [Range(0, double.MaxValue)]
    public decimal Price { get; set; }

    [Required]
    public string YearId { get; set; } = string.Empty;

    [Required]
    public string StageId { get; set; } = string.Empty;

    public string? InstructorId { get; set; }

    // Optional fields
    public string? Description { get; set; }
    public int? SortOrder { get; set; }
    // Image path (string) - client can send existing path or server will set it when uploading
    public string? ImagePath { get; set; }
}

