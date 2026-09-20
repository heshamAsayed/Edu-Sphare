using EduSphare.Application.DTOs.SiteStructure;

namespace EduSphare.Application.Services.Interface.SiteStructure
{
    public interface IStructureService
    {
        Task<SiteStructureDto?> AddSchool(SchoolDto schoolDto);
        Task<SiteStructureDto?> AddStage(StageDto stageDto);
        Task<SiteStructureDto?> AddYear(YearDto yearDto);
        Task<IEnumerable<SchoolWithStagesDto>> GetSchoolsWithStages();
        Task<IEnumerable<StageWithYearsDto>> GetStagesWithYears();
        Task<IEnumerable<YearWithCoursesDto>> GetYearsWithCourses();
    }
}
