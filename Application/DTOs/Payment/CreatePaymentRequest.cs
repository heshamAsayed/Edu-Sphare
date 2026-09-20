namespace EduSphare.Application.DTOs.Payment
{
    public class CreatePaymentRequest
    {
        public int OrderId { get; set; }
        public decimal AmountEgp { get; set; }
        public string FirstName { get; set; } = default!;
        public string LastName { get; set; } = default!;
        public string Email { get; set; } = default!;
        public string PhoneNumber { get; set; } = default!;

        // Added to allow correlating payment to domain entities
        public string? StudentId { get; set; }
        public string? CourseId { get; set; }
        public string? InstructorId { get; set; }
        // dynamic notification url provided by controller (fallback to options in service)
        public string? NotificationUrl { get; set; }
        // full URL where the user should be redirected after payment (frontend callback)
        public string? RedirectionUrl { get; set; }
    }
}
