namespace EduSphare.Application.DTOs.SiteStructure
{
    public class SiteStructureDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int OrderNo { get; set; }
        public string? ParentId { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        // Optional image path for schools
        public string ImagePath { get; set; } = string.Empty;
    }
}
