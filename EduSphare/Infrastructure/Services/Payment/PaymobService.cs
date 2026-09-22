using EduSphare.Application.Services.Interface.Payment;
using EduSphare.Web.Controllers.API;
using EduSphare.Application.Services.Interface.Payment;
using Microsoft.AspNetCore.Http;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using System.Net.Http.Headers;
using System.Text.Json;
using EduSphare.Domain.Models.Payment;
using EduSphare.Application.DTOs.Payment;

namespace EduSphare.Infrastructure.Services.Payment
{
    public class PaymobService : IPaymentService
    {
        private readonly HttpClient _http;
        private readonly PaymobOptions _options;
        private readonly IStudentCoursePaymentService _studentCoursePaymentService;

        public PaymobService(HttpClient http, IOptions<PaymobOptions> options, IStudentCoursePaymentService studentCoursePaymentService)
        {
            _http = http;
            _options = options.Value;
            _studentCoursePaymentService = studentCoursePaymentService;
            _http.BaseAddress = new Uri(_options.BaseUrl);
            _http.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Token", _options.SecretKey);
        }

        public async Task<JsonElement> CreateIntentionAsync(CreatePaymentRequest req)
        {
            var amountCents = (int)(req.AmountEgp * 100);

            // Each Paymob intention needs a unique merchant order reference. Keep the
            // first four fields stable for webhook correlation and append a payment-attempt
            // identifier so a student can retry a failed or abandoned checkout.
            // Format: {studentId}|{courseId}|{instructorId}|{orderId}|{attemptId}
            var paymentAttemptId = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var specialRef = $"{req.StudentId}|{req.CourseId}|{req.InstructorId}|{req.OrderId}|{paymentAttemptId}";

            var payload = new
            {
                amount = amountCents,
                currency = "EGP",
                payment_methods = new object[] { 5920237, 5920350,5920237, 5929199 }, // حط الـ Integration ID بتاعك
                items = new[]
                {
                new { name = $"Order #{req.OrderId}", amount = amountCents, quantity = 1 }
            },
                billing_data = new
                {
                    first_name = req.FirstName,
                    last_name = req.LastName,
                    email = req.Email,
                    phone_number = req.PhoneNumber,
                    apartment = "NA",
                    floor = "NA",
                    street = "NA",
                    building = "NA",
                    shipping_method = "NA",
                    postal_code = "NA",
                    city = "NA",
                    country = "EG",
                    state = "NA"
                },
                special_reference = specialRef,
                notification_url = string.IsNullOrWhiteSpace(req.NotificationUrl) ? _options.NotificationUrl : req.NotificationUrl,
                redirection_url = req.RedirectionUrl
            };

            using var response = await _http.PostAsJsonAsync("/v1/intention/", payload);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                throw new HttpRequestException(
                    $"Paymob returned {(int)response.StatusCode} {response.StatusCode}: {responseBody}");
            }

            using var responseDocument = JsonDocument.Parse(responseBody);
            return responseDocument.RootElement.Clone();
        }

        // Process webhook payload from Paymob. Verifies HMAC (if present) and checks success flag before saving.
        public async Task<bool> ProcessWebhookAsync(string body, Microsoft.AspNetCore.Http.IQueryCollection query)
        {
            if (string.IsNullOrWhiteSpace(body))
                return false;

            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;

            // HMAC must be provided as query parameter named "hmac"
            if (!query.TryGetValue("hmac", out var hmacVals))
                return false;

            var receivedHmac = hmacVals.FirstOrDefault();
            if (string.IsNullOrWhiteSpace(receivedHmac))
                return false;

            // Build concatenated string from obj fields in exact order
            if (!root.TryGetProperty("obj", out var obj))
                return false;

            string GetValue(JsonElement parent, string propName)
            {
                if (!parent.TryGetProperty(propName, out var p) || p.ValueKind == JsonValueKind.Null)
                    return string.Empty;
                // for string types return raw string; for others return raw text without quotes
                return p.ValueKind == JsonValueKind.String ? p.GetString() ?? string.Empty : p.GetRawText();
            }

            string GetNested(JsonElement parent, params string[] path)
            {
                JsonElement cur = parent;
                foreach (var p in path)
                {
                    if (!cur.TryGetProperty(p, out var next) || next.ValueKind == JsonValueKind.Null)
                        return string.Empty;
                    cur = next;
                }
                return cur.ValueKind == JsonValueKind.String ? cur.GetString() ?? string.Empty : cur.GetRawText();
            }

            var parts = new[]
            {
                GetValue(obj, "amount_cents"),
                GetValue(obj, "created_at"),
                GetValue(obj, "currency"),
                GetValue(obj, "error_occured"),
                GetValue(obj, "has_parent_transaction"),
                GetValue(obj, "id"),
                GetValue(obj, "integration_id"),
                GetValue(obj, "is_3d_secure"),
                GetValue(obj, "is_auth"),
                GetValue(obj, "is_capture"),
                GetValue(obj, "is_refunded"),
                GetValue(obj, "is_standalone_payment"),
                GetValue(obj, "is_voided"),
                GetNested(obj, "order", "id"),
                GetValue(obj, "owner"),
                GetValue(obj, "pending"),
                GetNested(obj, "source_data", "pan"),
                GetNested(obj, "source_data", "sub_type"),
                GetNested(obj, "source_data", "type"),
                GetValue(obj, "success")
            };

            var concatenated = string.Concat(parts);

            if (string.IsNullOrWhiteSpace(_options.HmacSecret))
                return false; // require secret to be configured

            byte[] secretBytes = Encoding.UTF8.GetBytes(_options.HmacSecret);
            using var hmac = new HMACSHA512(secretBytes);
            var computed = hmac.ComputeHash(Encoding.UTF8.GetBytes(concatenated));
            var computedHex = Convert.ToHexString(computed).ToLowerInvariant();

            if (!string.Equals(computedHex, receivedHmac?.ToLowerInvariant(), StringComparison.OrdinalIgnoreCase))
                return false; // invalid signature

            // signature ok — verify success flag inside obj
            bool success = false;
            if (obj.TryGetProperty("success", out var suc) && suc.ValueKind == JsonValueKind.True)
                success = true;

            if (!success)
                return false;

            // Paymob returns special_reference as merchant_order_id inside the order
            // object in transaction callbacks.
            string? specialReference = null;
            if (root.TryGetProperty("special_reference", out var sr)) specialReference = sr.GetString();
            if (specialReference is null && obj.TryGetProperty("special_reference", out var sr2))
                specialReference = sr2.GetString();
            if (specialReference is null && obj.TryGetProperty("order", out var order)
                && order.TryGetProperty("merchant_order_id", out var merchantOrderId))
                specialReference = merchantOrderId.GetString();

            if (string.IsNullOrWhiteSpace(specialReference))
                return false;

            // amount: prefer amount_cents inside obj; convert to EGP decimal
            decimal amount = 0;
            if (obj.TryGetProperty("amount_cents", out var amt) && amt.ValueKind != JsonValueKind.Null)
            {
                if (amt.TryGetInt32(out var cents)) amount = cents / 100m;
                else
                {
                    // try as string
                    var s = amt.GetRawText().Trim('"');
                    if (int.TryParse(s, out var c2)) amount = c2 / 100m;
                }
            }

            return await SaveConfirmedPaymentAsync(specialReference, amount);
        }

        public async Task<bool> ProcessRedirectAsync(IQueryCollection query)
        {
            if (!query.TryGetValue("hmac", out var hmacValues))
                return false;

            var receivedHmac = hmacValues.FirstOrDefault();
            if (string.IsNullOrWhiteSpace(receivedHmac) || string.IsNullOrWhiteSpace(_options.HmacSecret))
                return false;

            string Value(params string[] keys) => keys
                .Select(key => query.TryGetValue(key, out var value) ? value.FirstOrDefault() : null)
                .FirstOrDefault(value => value is not null) ?? string.Empty;

            var parts = new[]
            {
                Value("amount_cents"), Value("created_at"), Value("currency"), Value("error_occured"),
                Value("has_parent_transaction"), Value("id"), Value("integration_id"), Value("is_3d_secure"),
                Value("is_auth"), Value("is_capture"), Value("is_refunded"), Value("is_standalone_payment"),
                Value("is_voided"), Value("order", "order.id"), Value("owner"), Value("pending"),
                Value("source_data.pan", "source_data_pan"),
                Value("source_data.sub_type", "source_data_sub_type"),
                Value("source_data.type", "source_data_type"), Value("success")
            };

            using var hmac = new HMACSHA512(Encoding.UTF8.GetBytes(_options.HmacSecret));
            var calculatedHmac = Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(string.Concat(parts))))
                .ToLowerInvariant();

            if (!string.Equals(calculatedHmac, receivedHmac, StringComparison.OrdinalIgnoreCase)
                || !string.Equals(Value("success"), "true", StringComparison.OrdinalIgnoreCase))
                return false;

            var specialReference = Value("merchant_order_id", "special_reference");
            if (string.IsNullOrWhiteSpace(specialReference)
                || !decimal.TryParse(Value("amount_cents"), out var amountCents))
                return false;

            return await SaveConfirmedPaymentAsync(specialReference, amountCents / 100m);
        }

        private async Task<bool> SaveConfirmedPaymentAsync(string specialReference, decimal amount)
        {
            var refs = specialReference.Split('|');
            if (refs.Length < 4 || refs.Take(3).Any(string.IsNullOrWhiteSpace))
                return false;

            var dto = new StudentCoursePaymentDto
            {
                StudentId = refs[0],
                CourseId = refs[1],
                InstructorId = refs[2],
                Amount = amount,
                PaymentDate = DateTime.UtcNow,
                PaymentMethod = "Paymob",
                CodePaid = refs[3],
                IsPaid = true
            };

            await _studentCoursePaymentService.SaveStudentCoursePaymentAsync(dto);
            return true;
        }
    }
}
