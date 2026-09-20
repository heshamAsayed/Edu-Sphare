namespace EduSphare.Domain.Models.Payment
{
    public class PaymobOptions
    {
        public string SecretKey { get; set; } = default!;
        public string PublicKey { get; set; } = default!;
        public string HmacSecret { get; set; } = default!;
        public string BaseUrl { get; set; } = default!;
        public string NotificationUrl { get; set; } = default!;
        // optional frontend base URL used as fallback for redirection_url when frontend runs on different origin
        public string? FrontendBaseUrl { get; set; }
        // optional fallback redirection URL (full URL) if frontend does not provide one
        public string? RedirectionUrl { get; set; }
        // allowed frontend domains whitelist (hosts only, e.g. "localhost", "myapp.com")
        public string[]? AllowedFrontendDomains { get; set; }
    }
}
