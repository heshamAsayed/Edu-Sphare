namespace EduSphare.Application.DTOs.Payment
{
    public class CreatePaymentResponse
    {
        public string ClientSecret { get; set; } = default!;
        public string PublicKey { get; set; } = default!;
        public string UnifiedCheckoutUrl { get; set; } = default!;
    }
}
