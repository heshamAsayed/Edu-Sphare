using EduSphare.Application.DTOs.Payment;
using EduSphare.Application.Services.Interface.Payment;
using EduSphare.Domain.Entities;
using EduSphare.Infrastructure.UnitOfWork;

namespace EduSphare.Application.Services.Implement.Payment
{
    public class StudentCoursePaymentService : IStudentCoursePaymentService
    {
        private readonly IUnitOfWork _uow;

        public StudentCoursePaymentService(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task SaveStudentCoursePaymentAsync(StudentCoursePaymentDto dto)
        {
            // Avoid duplicate enrollments
            if (await _uow.Enrollments.AnyAsync(e => e.StudentId == dto.StudentId && e.CourseId == dto.CourseId))
                return;

            var entity = new StudentCoursePaid(
                dto.StudentId,
                dto.CourseId,
                dto.InstructorId,
                dto.PaymentDate,
                dto.Amount,
                dto.CodePaid,
                dto.PaymentMethod);

            _uow.Enrollments.Add(entity);
            await _uow.SaveChangesAsync();
        }
    }
}
