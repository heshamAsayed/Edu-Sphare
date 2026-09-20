using EduSphare.Application.Services.Implement.Auth;
using EduSphare.Application.Services.Implement.StreamVideo;
using EduSphare.Application.Services.Interface.Ai;
using EduSphare.Application.Services.Interface.Auth;
using EduSphare.Application.Services.Interface.Courses;
using EduSphare.Application.Services.Interface.Payment;
using EduSphare.Domain.Models.Payment;
using EduSphare.Infrastructure.Services.Ai;
using EduSphare.Infrastructure.Services.Payment;
using EduSphare.Infrastructure.Settings;
using EduSphare.Infrastructure.UnitOfWork;
using EduSphare.Infrastructure.UnitOfWork.DataControll;

namespace EduSphare.Infrastructure.DependencyInjection
{
    public static class ServiceContainer
    {
        public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
            services.AddScoped<IUnitOfWork, UOW>();
            services.AddScoped<ITeacher, TeacherService>();

            services.Configure<BunnySettings>(configuration.GetSection(BunnySettings.SectionName));
            services.Configure<DeepgramSettings>(configuration.GetSection(DeepgramSettings.SectionName));
            services.Configure<AttachmentStorageSettings>(configuration.GetSection(AttachmentStorageSettings.SectionName));

            services.AddHttpClient<IUploadVideo, BunnyStreamUploadService>();

            services.Configure<AiSettings>(configuration.GetSection(AiSettings.SectionName));
            services.AddHttpClient<EduSphare.Application.Services.Interface.Ai.IAiAttentionQuestionService, EduSphare.Infrastructure.Services.Ai.AiAttentionQuestionService>();

            services.AddScoped<IDeepgramTranscriptionService, DeepgramTranscriptionService>();
            services.AddHttpClient("Deepgram", client => client.Timeout = TimeSpan.FromMinutes(30));
            services.AddSingleton<IVideoTranscriptionQueue, VideoTranscriptionQueue>();
            services.AddHostedService<BackgroundTranscriptionService>();
            services.AddHttpClient("Deepgram", client =>
            {
                client.Timeout = TimeSpan.FromMinutes(10);
            });



            services.AddScoped<IPaymentService, PaymobService>();
            services.Configure<PaymobOptions>(configuration.GetSection("Paymob"));
            services.AddHttpClient<PaymobService>();


            return services;
        }
    }
}
