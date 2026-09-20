using EduSphare.Application.DTOs.Payment;
using System.Threading.Tasks;

namespace EduSphare.Application.Services.Interface.Payment
{
    public interface IStudentCoursePaymentService
    {
        Task SaveStudentCoursePaymentAsync(StudentCoursePaymentDto dto);
    }
}
