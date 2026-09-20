using EduSphare.Domain.Entities;
using EduSphare.Domain.Entities.Users;
using EduSphare.Domain.Entities.Main;
using EduSphare.Infrastructure.Data;
using EduSphare.Infrastructure.UnitOfWork.DataControll;
using Microsoft.EntityFrameworkCore.Storage;

namespace EduSphare.Infrastructure.UnitOfWork;

public class UOW : IUnitOfWork
{
    private readonly ApplicationDbContext _context;

    public IRepository<ApplicationUser> Users { get; }
    public IRepository<Student> Students { get; }
    public IRepository<Teacher> Teachers { get; }
    public IRepository<Course> Courses { get; }
    public IRepository<Video> Videos { get; }
    public IRepository<WatchedVideo> WatchedVideos { get; }
    public IRepository<VideoAttachment> VideoAttachments { get; }
    public IRepository<StudentCoursePaid> Enrollments { get; }
    public IRepository<School> Schools { get; }
    public IRepository<Stage> Stages { get; }
    public IRepository<Year> Years { get; }

    public UOW(ApplicationDbContext context)
    {
        _context = context;
        Users = new Repository<ApplicationUser>(_context);
        Students = new Repository<Student>(_context);
        Teachers = new Repository<Teacher>(_context);
        Courses = new Repository<Course>(_context);
        Videos = new Repository<Video>(_context);
        WatchedVideos = new Repository<WatchedVideo>(_context);
        VideoAttachments = new Repository<VideoAttachment>(_context);
        Enrollments = new Repository<StudentCoursePaid>(_context);
        Schools = new Repository<School>(_context);
        Stages = new Repository<Stage>(_context);
        Years = new Repository<Year>(_context);
    }

    public Task<IDbContextTransaction> BeginTransactionAsync() =>
        _context.Database.BeginTransactionAsync();

    public Task<T> ExecuteInTransactionAsync<T>(Func<Task<T>> operation)
    {
        var strategy = _context.Database.CreateExecutionStrategy();
        return strategy.ExecuteAsync(operation, async (_, callback, cancellationToken) =>
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
            var result = await callback();
            await transaction.CommitAsync(cancellationToken);
            return result;
        }, null, CancellationToken.None);
    }

    public Task<int> SaveChangesAsync() => _context.SaveChangesAsync();
}
