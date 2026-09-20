using System.ComponentModel.DataAnnotations;

namespace EduSphare.Application.DTOs.SiteStructure
{
    public class StageDto
    {
        public string Id { get; set; } = string.Empty;

        [Required]
        [StringLength(150)]
        public string Name { get; set; } = string.Empty;

        [Range(1, int.MaxValue)]
        public int OrderNo { get; set; }
        [Required]
        public string SchoolId { get; set; } = string.Empty;
    }
}
