using System.ComponentModel.DataAnnotations;

namespace EduSphare.Application.DTOs.SiteStructure
{
    public class SchoolDto
    {
        public string Id { get; set; } = string.Empty;

        [Required]
        [StringLength(150)]
        public string Name { get; set; } = string.Empty;
        // Path to image (e.g. /resources/images/file.jpg)
        public string ImagePath { get; set; } = string.Empty;
    }
}
