using EduSphare.Application.DTOs.Auth.Student;
using EduSphare.Application.DTOs.Auth.Teacher;
using EduSphare.Application.DTOs.Courses;
using EduSphare.Application.DTOs.SiteStructure;
using EduSphare.Domain.Entities;
using EduSphare.Domain.Entities.Main;
using EduSphare.Domain.Entities.Users;
using AutoMapper;

namespace EduSphare.Application.Mapping
{
    public class MapProfile : Profile
    {
        public MapProfile()
        {
            CreateMap<RegisterSTDDto, ApplicationUser>(MemberList.None)
                .ForMember(dest => dest.UserName, opt => opt.MapFrom(src => src.Email))
                .ForMember(dest => dest.PhoneNumber, opt => opt.MapFrom(src => src.Mobile));

            CreateMap<RegisterSTDDto, Student>(MemberList.None)
                .ForMember(dest => dest.ApplicationUserId, opt => opt.Ignore())
                .ForMember(dest => dest.JoinDate, opt => opt.Ignore())
                .ForMember(dest => dest.ApplicationUser, opt => opt.Ignore())
                .ForMember(dest => dest.StudentCoursePaids, opt => opt.Ignore())
                .ForMember(dest => dest.WatchedVideos, opt => opt.Ignore());

            CreateMap<ApplicationUser, RegisterSTDDtoResponse>(MemberList.None)
                .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.Id));

            CreateMap<LoginSTDDto, ApplicationUser>(MemberList.None)
                .ForMember(dest => dest.UserName, opt => opt.MapFrom(src => src.Email));

            CreateMap<ApplicationUser, AuthResponseDto>(MemberList.None)
                .ForMember(dest => dest.Token, opt => opt.Ignore())
                .ForMember(dest => dest.Message, opt => opt.Ignore());

            CreateMap<TeacherDto, ApplicationUser>(MemberList.None)
                .ForMember(dest => dest.UserName, opt => opt.MapFrom(src => string.IsNullOrWhiteSpace(src.UserName) ? src.Email : src.UserName));

            CreateMap<TeacherDto, Teacher>(MemberList.None)
                .ForMember(dest => dest.ApplicationUserId, opt => opt.Ignore())
                .ForMember(dest => dest.ApplicationUser, opt => opt.Ignore())
                .ForMember(dest => dest.Courses, opt => opt.Ignore())
                .ForMember(dest => dest.StudentCoursePaids, opt => opt.Ignore());

            CreateMap<Teacher, TeacherDetailsDto>()
                .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.ApplicationUserId))
                .ForMember(dest => dest.Name, opt => opt.MapFrom(src => src.ApplicationUser.Name))
                .ForMember(dest => dest.Email, opt => opt.MapFrom(src => src.ApplicationUser.Email ?? string.Empty))
                .ForMember(dest => dest.UserName, opt => opt.MapFrom(src => src.ApplicationUser.UserName ?? string.Empty))
                .ForMember(dest => dest.PhoneNumber, opt => opt.MapFrom(src => src.ApplicationUser.PhoneNumber ?? string.Empty))
                .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => src.ApplicationUser.CreatedAt))
                .ForMember(dest => dest.IsDeleted, opt => opt.MapFrom(src => src.ApplicationUser.IsDeleted))
                .ForMember(dest => dest.DeletedAt, opt => opt.MapFrom(src => src.ApplicationUser.DeletedAt))
                .ForMember(dest => dest.CoursesCount, opt => opt.MapFrom(src => src.Courses == null ? 0 : src.Courses.Count));

            CreateMap<Course, TeacherCourseDto>()
                .ForMember(dest => dest.VideosCount, opt => opt.MapFrom(src => src.Videos == null ? 0 : src.Videos.Count))
                .ForMember(dest => dest.PaidStudentsCount, opt => opt.MapFrom(src => src.StudentCoursePaids == null ? 0 : src.StudentCoursePaids.Count));

            CreateMap<SchoolDto, School>(MemberList.None)
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.Stages, opt => opt.Ignore());
            CreateMap<StageDto, Stage>(MemberList.None)
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.SchoolId, opt => opt.Ignore())
                .ForMember(dest => dest.School, opt => opt.Ignore())
                .ForMember(dest => dest.Years, opt => opt.Ignore());
            CreateMap<YearDto, Year>(MemberList.None)
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.StageId, opt => opt.Ignore())
                .ForMember(dest => dest.Stage, opt => opt.Ignore());

            CreateMap<School, SiteStructureDto>()
                .ForMember(dest => dest.Type, opt => opt.MapFrom(_ => "School"))
                .ForMember(dest => dest.Message, opt => opt.MapFrom(_ => "School added successfully."))
                .ForMember(dest => dest.ImagePath, opt => opt.MapFrom(src => src.ImagePath ?? string.Empty))
                .ForMember(dest => dest.ParentId, opt => opt.Ignore())
                .ForMember(dest => dest.OrderNo, opt => opt.Ignore());
            CreateMap<Stage, SiteStructureDto>()
                .ForMember(dest => dest.Type, opt => opt.MapFrom(_ => "Stage"))
                .ForMember(dest => dest.Message, opt => opt.MapFrom(_ => "Stage added successfully."))
                .ForMember(dest => dest.ParentId, opt => opt.MapFrom(src => src.SchoolId));
            CreateMap<Year, SiteStructureDto>()
                .ForMember(dest => dest.Type, opt => opt.MapFrom(_ => "Year"))
                .ForMember(dest => dest.Message, opt => opt.MapFrom(_ => "Year added successfully."))
                .ForMember(dest => dest.ParentId, opt => opt.MapFrom(src => src.StageId));

            CreateMap<School, SchoolWithStagesDto>();
            CreateMap<Stage, StageSummaryDto>();
            CreateMap<Stage, StageWithYearsDto>();
            CreateMap<Year, YearSummaryDto>();
            CreateMap<Year, YearWithCoursesDto>();
            CreateMap<Course, CourseSummaryDto>();

            CreateMap<Student, StudentDetailsDto>()
                .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.ApplicationUserId))
                .ForMember(dest => dest.Name, opt => opt.MapFrom(src => src.ApplicationUser.Name))
                .ForMember(dest => dest.Email, opt => opt.MapFrom(src => src.ApplicationUser.Email ?? string.Empty))
                .ForMember(dest => dest.UserName, opt => opt.MapFrom(src => src.ApplicationUser.UserName ?? string.Empty))
                .ForMember(dest => dest.PhoneNumber, opt => opt.MapFrom(src => src.ApplicationUser.PhoneNumber ?? string.Empty))
                .ForMember(dest => dest.PaidCourses, opt => opt.MapFrom(src => src.StudentCoursePaids));

            CreateMap<StudentCoursePaid, PaidCourseDto>()
                .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.Id))
                .ForMember(dest => dest.CourseId, opt => opt.MapFrom(src => src.CourseId))
                .ForMember(dest => dest.CourseName, opt => opt.MapFrom(src => src.Course == null ? string.Empty : src.Course.Name));

            CreateMap<Course, CourseDTo>()
                .ForMember(dest => dest.Name, opt => opt.MapFrom(src => src.Name))
                .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => src.CreatedAt))
                .ForMember(dest => dest.Title, opt => opt.MapFrom(src => src.Name))
                .ForMember(dest => dest.Description, opt => opt.MapFrom(src => src.Description))
                .ForMember(dest => dest.SortOrder, opt => opt.MapFrom(src => src.SortOrder))
                .ForMember(dest => dest.ImagePath, opt => opt.MapFrom(src => src.ImagePath))
                .ForMember(dest => dest.Price, opt => opt.MapFrom(src => src.Price))
                .ForMember(dest => dest.VideosCount, opt => opt.MapFrom(src => src.Videos == null ? 0 : src.Videos.Count))
                .ForMember(dest => dest.Videos, opt => opt.MapFrom(src => src.Videos))
                .ForMember(dest => dest.TeacherName, opt => opt.MapFrom(src => src.teachers != null && src.teachers.Any() ? src.teachers.First().ApplicationUser.Name : string.Empty))
                .ForMember(dest => dest.IsPaid, opt => opt.MapFrom(src => false));
            CreateMap<CreateCourseDTo, Course>()
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.Year, opt => opt.Ignore())
                .ForMember(dest => dest.Stage, opt => opt.Ignore())
                .ForMember(dest => dest.Videos, opt => opt.Ignore())
                .ForMember(dest => dest.StudentCoursePaids, opt => opt.Ignore())
                .ForMember(dest => dest.TimeLine, opt => opt.Ignore())
                .ForMember(dest => dest.teachers, opt => opt.Ignore())
                .ForMember(dest => dest.Description, opt => opt.MapFrom(src => src.Description))
                .ForMember(dest => dest.SortOrder, opt => opt.MapFrom(src => src.SortOrder ?? 0))
                .ForMember(dest => dest.ImagePath, opt => opt.MapFrom(src => src.ImagePath ?? string.Empty));
            CreateMap<UpdateCourseDTo, Course>()
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.Year, opt => opt.Ignore())
                .ForMember(dest => dest.Stage, opt => opt.Ignore())
                .ForMember(dest => dest.Videos, opt => opt.Ignore())
                .ForMember(dest => dest.StudentCoursePaids, opt => opt.Ignore())
                .ForMember(dest => dest.TimeLine, opt => opt.Ignore())
                .ForMember(dest => dest.teachers, opt => opt.Ignore())
                .ForMember(dest => dest.Description, opt => opt.MapFrom(src => src.Description))
                .ForMember(dest => dest.SortOrder, opt => opt.MapFrom(src => src.SortOrder ?? 0))
                .ForMember(dest => dest.ImagePath, opt => opt.MapFrom(src => src.ImagePath ?? string.Empty));
            CreateMap<Video, VideoDTo>()
                .ForMember(dest => dest.IsWatched, opt => opt.Ignore())
                .ForMember(dest => dest.Attachments, opt => opt.Ignore())
                .ForMember(dest => dest.BunnyVideoId, opt => opt.MapFrom(src => src.BunnyVideoId ?? string.Empty));

            CreateMap<Video, VideoResponseDto>()
                .ForMember(dest => dest.BunnyVideoId, opt => opt.MapFrom(src => src.BunnyVideoId ?? string.Empty));
            CreateMap<VideoAttachment, VideoAttachmentDto>();
        }
    }
}
