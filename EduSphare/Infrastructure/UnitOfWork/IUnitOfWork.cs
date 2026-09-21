using EduSphare.Domain.Entities;
using EduSphare.Domain.Entities.Main;
using EduSphare.Domain.Entities.Users;
using EduSphare.Domain.Entities.Verification;
using EduSphare.Infrastructure.UnitOfWork.DataControll;
using Microsoft.EntityFrameworkCore.Storage;

namespace EduSphare.Infrastructure.UnitOfWork;

public interface IUnitOfWork
{
    IRepository<ApplicationUser> Users { get; }
    IRepository<Student> Students { get; }
    IRepository<Teacher> Teachers { get; }
    IRepository<Course> Courses { get; }
    IRepository<Video> Videos { get; }
    IRepository<WatchedVideo> WatchedVideos { get; }
    IRepository<VideoAttachment> VideoAttachments { get; }
    IRepository<StudentCoursePaid> Enrollments { get; }
    IRepository<School> Schools { get; }
    IRepository<Stage> Stages { get; }
    IRepository<Year> Years { get; }
    IRepository<PhoneVerification> PhoneVerifications { get; }
    Task<IDbContextTransaction> BeginTransactionAsync();
    Task<T> ExecuteInTransactionAsync<T>(Func<Task<T>> operation);
    Task<int> SaveChangesAsync();
}
