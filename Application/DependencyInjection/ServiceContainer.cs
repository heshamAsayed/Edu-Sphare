using EduSphare.Application.Services.Implement.Auth;
using EduSphare.Application.Services.Interface.Auth;
using EduSphare.Application.Services.Implement.SiteStructure;
using EduSphare.Application.Services.Interface.SiteStructure;
using EduSphare.Application.Services.Interface.Courses;
using EduSphare.Application.Services.Implement.Courses;
using EduSphare.Application.Services.Implement.Reports;
using EduSphare.Application.Services.Interface.Reports;
using EduSphare.Application.Services.Interface.Ai;
using EduSphare.Application.Services.Interface.Payment;
using EduSphare.Application.Services.Implement.Payment;
using Microsoft.Extensions.DependencyInjection;

namespace EduSphare.Application.DependencyInjection
{
    public static class ServiceContainer
    {
        public static IServiceCollection AddApplicationServices(this IServiceCollection services)
        {
            services.AddAutoMapper(config => config.AddProfile<EduSphare.Application.Mapping.MapProfile>());
            services.AddScoped<IStudent, StudnetService>();
            services.AddScoped<IStructureService, StructureService>();
            services.AddScoped<ICourses, CoursesService>();
            services.AddScoped<IVideos, VideosService>();
            services.AddScoped<IVideoAnalyticsService, VideoAnalyticsService>();
            services.AddScoped<ICurrentUserService, CurrentUserService>();
            services.AddScoped<IFinancialReportService, FinancialReportService>();
            services.AddScoped<IVideoQuizCatalogService, VideoQuizCatalogService>();
            services.AddScoped<IStudentCoursePaymentService, StudentCoursePaymentService>();

            return services;
        }
    }
}
