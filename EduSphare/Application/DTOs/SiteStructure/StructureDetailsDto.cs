namespace EduSphare.Application.DTOs.SiteStructure
{
    public class SchoolWithStagesDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        // Path to image for the school
        public string ImagePath { get; set; } = string.Empty;
        public ICollection<StageWithYearsDto> Stages { get; set; } = new List<StageWithYearsDto>();
    }

    public class StageSummaryDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int OrderNo { get; set; }
    
    }

    public class StageWithYearsDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int OrderNo { get; set; }
        public string SchoolId { get; set; } = string.Empty;
        public ICollection<YearSummaryDto> Years { get; set; } = new List<YearSummaryDto>();
    }

    public class YearSummaryDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int OrderNo { get; set; }
    }

    public class YearWithCoursesDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int OrderNo { get; set; }
        public string StageId { get; set; } = string.Empty;
        public ICollection<CourseSummaryDto> Courses { get; set; } = new List<CourseSummaryDto>();
    }

    public class CourseSummaryDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public DateTime CreatedAt { get; set; }
        public string StageId { get; set; } = string.Empty;
    }
}
