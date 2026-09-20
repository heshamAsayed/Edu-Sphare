using EduSphare.Application.DTOs.SiteStructure;
using EduSphare.Application.Services.Interface.SiteStructure;
using EduSphare.Domain.Entities.Main;
using EduSphare.Infrastructure.UnitOfWork;
using AutoMapper;

namespace EduSphare.Application.Services.Implement.SiteStructure
{
    public class StructureService(IUnitOfWork uow, IMapper mapper) : IStructureService
    {
        public async Task<SiteStructureDto?> AddSchool(SchoolDto schoolDto)
        {
            var duplicate = await uow.Schools.GetByQuery(s => s.Name == schoolDto.Name);
            if (duplicate is not null)
                return null;

            var school = mapper.Map<School>(schoolDto);
            school.Id = Guid.NewGuid().ToString();
            uow.Schools.Add(school);
            await uow.SaveChangesAsync();

            return mapper.Map<SiteStructureDto>(school);
        }

        public async Task<SiteStructureDto?> AddStage(StageDto stageDto)
        {
            var school = await uow.Schools.GetByIdAsync(stageDto.SchoolId);
            if (school is null)
                return null;

            var duplicate = await uow.Stages.GetByQuery(s =>
                s.SchoolId == school.Id && s.Name == stageDto.Name);
            if (duplicate is not null)
                return null;

            var stage = mapper.Map<Stage>(stageDto);
            stage.Id = Guid.NewGuid().ToString();
            stage.SchoolId = school.Id;
            uow.Stages.Add(stage);
            await uow.SaveChangesAsync();

            return mapper.Map<SiteStructureDto>(stage);
        }

        public async Task<SiteStructureDto?> AddYear(YearDto yearDto)
        {
            var stage = await uow.Stages.GetByIdAsync(yearDto.StageId);
            if (stage is null)
                return null;

            var duplicate = await uow.Years.GetByQuery(y =>
                y.StageId == stage.Id && y.Name == yearDto.Name);
            if (duplicate is not null)
                return null;

            var year = mapper.Map<Year>(yearDto);
            year.Id = Guid.NewGuid().ToString();
            year.StageId = stage.Id;
            uow.Years.Add(year);
            await uow.SaveChangesAsync();

            return mapper.Map<SiteStructureDto>(year);
        }

        public async Task<IEnumerable<SchoolWithStagesDto>> GetSchoolsWithStages()
        {
            var schools = await uow.Schools.GetAllIncludingAsync("Stages");
            var stages = await uow.Stages.GetAllIncludingAsync("Years");
            //mapper.Map<IEnumerable<StageWithYearsDto>>(stages);

            var schoolwithstages = mapper.Map<IEnumerable<SchoolWithStagesDto>>(schools);

            foreach (var school in schoolwithstages)
            {
                var schoolStages = stages.Where(s => s.SchoolId == school.Id).ToList();
                school.Stages = mapper.Map<List<StageWithYearsDto>>(schoolStages);
            }


            return mapper.Map<IEnumerable<SchoolWithStagesDto>>(schoolwithstages);
        }

        public async Task<IEnumerable<StageWithYearsDto>> GetStagesWithYears()
        {
            var stages = await uow.Stages.GetAllIncludingAsync("Years");
            return mapper.Map<IEnumerable<StageWithYearsDto>>(stages);
        }

        public async Task<IEnumerable<YearWithCoursesDto>> GetYearsWithCourses()
        {
            var years = (await uow.Years.GetAllAsync()).ToList();
            var courses = await uow.Courses.GetAllAsync();
            var coursesByYear = courses.GroupBy(c => c.YearId)
                .ToDictionary(group => group.Key, group => group.ToList());

            var result = mapper.Map<List<YearWithCoursesDto>>(years);
            foreach (var year in result)
            {
                if (coursesByYear.TryGetValue(year.Id, out var yearCourses))
                    year.Courses = mapper.Map<List<CourseSummaryDto>>(yearCourses);
            }

            return result;
        }
    }
}
