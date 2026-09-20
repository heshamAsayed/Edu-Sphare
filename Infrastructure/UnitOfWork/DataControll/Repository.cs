using EduSphare.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace EduSphare.Infrastructure.UnitOfWork.DataControll;

public class Repository<T> : IRepository<T> where T : class
{
    private readonly ApplicationDbContext _context;

    public Repository(ApplicationDbContext context)
    {
        _context = context;
    }

    public void Add(T entity) => _context.Set<T>().Add(entity);

    public void Delete(T entity) => _context.Set<T>().Remove(entity);

    public void Update(T entity) => _context.Set<T>().Update(entity);

    public async Task<bool> IsExist(string id) =>
        await _context.Set<T>().FindAsync(id) is not null;

    public async Task<bool> AnyAsync(Expression<Func<T, bool>> predicate) =>
        await _context.Set<T>().AsNoTracking().AnyAsync(predicate);

    public async Task<T?> GetByIdAsync(string id) =>
        await _context.Set<T>().FindAsync(id);

    public async Task<T?> GetByQuery(Expression<Func<T, bool>> predicate) =>
        await _context.Set<T>().FirstOrDefaultAsync(predicate);

    public async Task<IEnumerable<T>> GetAllAsync() =>
        await _context.Set<T>().AsNoTracking().ToListAsync();

    public async Task<IEnumerable<T>> GetAllIncludingAsync(params string[] navigationProperties)
    {
        IQueryable<T> query = _context.Set<T>().AsNoTracking();
        foreach (var navigationProperty in navigationProperties)
            query = query.Include(navigationProperty);

        return await query.AsSplitQuery().ToListAsync();
    }

    public async Task<T?> GetByQueryIncludingAsync(Expression<Func<T, bool>> predicate, params string[] navigationProperties)
    {
        // Keep tracking — callers may update the returned entity (e.g. AddCourse).
        IQueryable<T> query = _context.Set<T>();
        foreach (var navigationProperty in navigationProperties)
            query = query.Include(navigationProperty);

        return await query.AsSplitQuery().FirstOrDefaultAsync(predicate);
    }

    public async Task<IReadOnlyList<T>> GetManyByQueryAsync(Expression<Func<T, bool>> predicate) =>
        await _context.Set<T>().AsNoTracking().Where(predicate).ToListAsync();

    public async Task<IReadOnlyList<T>> GetManyByQueryIncludingAsync(
        Expression<Func<T, bool>> predicate,
        params string[] navigationProperties)
    {
        IQueryable<T> query = _context.Set<T>().AsNoTracking().Where(predicate);
        foreach (var navigationProperty in navigationProperties)
            query = query.Include(navigationProperty);

        return await query.AsSplitQuery().ToListAsync();
    }
}
