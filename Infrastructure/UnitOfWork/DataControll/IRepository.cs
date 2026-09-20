using System.Linq.Expressions;

namespace EduSphare.Infrastructure.UnitOfWork.DataControll;

public interface IRepository<T> where T : class
{
    void Add(T entity);
    void Update(T entity);
    void Delete(T entity);
    Task<T?> GetByIdAsync(string id);
    Task<T?> GetByQuery(Expression<Func<T, bool>> predicate);
    Task<IEnumerable<T>> GetAllAsync();
    Task<IEnumerable<T>> GetAllIncludingAsync(params string[] navigationProperties);
    Task<T?> GetByQueryIncludingAsync(Expression<Func<T, bool>> predicate, params string[] navigationProperties);
    Task<IReadOnlyList<T>> GetManyByQueryAsync(Expression<Func<T, bool>> predicate);
    Task<IReadOnlyList<T>> GetManyByQueryIncludingAsync(Expression<Func<T, bool>> predicate, params string[] navigationProperties);
    Task<bool> AnyAsync(Expression<Func<T, bool>> predicate);
    Task<bool> IsExist(string id);
}
