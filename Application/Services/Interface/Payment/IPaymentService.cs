using EduSphare.Application.DTOs.Payment;
using System.Text.Json;

namespace EduSphare.Application.Services.Interface.Payment
{
    public interface IPaymentService
    {
        Task<JsonElement> CreateIntentionAsync(CreatePaymentRequest req);
    }
}
