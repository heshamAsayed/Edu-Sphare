using System.ComponentModel.DataAnnotations;
namespace EduSphare.Application.DTOs.Courses;
public class UpdateCourseDTo
{
    [Required]
    public string Id { get; set; } = string.Empty;

    [Required, StringLength(200)]
    public string Name { get; set; } = string.Empty;

    [Range(0, double.MaxValue)]
    public decimal Price { get; set; }

    [Required]
    public string YearId { get; set; } = string.Empty;

    [Required]
    public string StageId { get; set; } = string.Empty;

    // Optional fields
    public string? Description { get; set; }
    public int? SortOrder { get; set; }
    public string? ImagePath { get; set; }
}
