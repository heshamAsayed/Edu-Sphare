using EduSphare.Application.Services.Interface.Payment;
using EduSphare.Domain.Models.Payment;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using EduSphare.Application.DTOs.Payment;
using System.Text.Json;
using EduSphare.Infrastructure.UnitOfWork;

namespace EduSphare.Web.Controllers.API
{
    [Route("api/[controller]")]
    [ApiController]
    public class PaymentController : ControllerBase
    {
        private readonly IPaymentService _paymob;
        private readonly PaymobOptions _options;
        private readonly EduSphare.Infrastructure.Services.Payment.PaymobService _paymobConcrete;
        private readonly IUnitOfWork _uow;

        public PaymentController(
            IPaymentService paymob,
            IOptions<PaymobOptions> options,
            EduSphare.Infrastructure.Services.Payment.PaymobService paymobConcrete,
            IUnitOfWork uow)
        {
            _paymob = paymob;
            _options = options.Value;
            _paymobConcrete = paymobConcrete;
            _uow = uow;
        }

        [HttpPost("create")]
        [Authorize]
        public async Task<ActionResult<CreatePaymentResponse>> Create(CreatePaymentRequest req)
        {
            // get student id from claims
            var studentId = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(studentId))
                return Unauthorized();

            // attach student/course context so confirmation can correlate
            req.StudentId = studentId;

            // Never trust the browser for the paid amount or the course instructor.
            // Both values are resolved from the selected course on the server.
            if (string.IsNullOrWhiteSpace(req.CourseId))
                return BadRequest(new { message = "A course is required." });

            var course = await _uow.Courses.GetByQueryIncludingAsync(
                course => course.Id == req.CourseId,
                "teachers");
            var instructorId = course?.teachers?.FirstOrDefault()?.ApplicationUserId;

            if (course is null || string.IsNullOrWhiteSpace(instructorId))
                return BadRequest(new { message = "The course or its instructor could not be found." });

            req.InstructorId = instructorId;
            req.AmountEgp = course.Price;
            // Paymob must be able to reach the webhook from the public internet.
            // Prefer the configured public URL; fall back to the current host for deployed APIs.
            req.NotificationUrl = !string.IsNullOrWhiteSpace(_options.NotificationUrl)
                ? _options.NotificationUrl
                : $"{Request.Scheme}://{Request.Host}/api/payment/webhook";

            // redirection URL must be provided by frontend in the request body and validated against allowed domains
            if (string.IsNullOrWhiteSpace(req.RedirectionUrl))
                return BadRequest(new { message = "Invalid redirection URL" });

            if (!Uri.TryCreate(req.RedirectionUrl, UriKind.Absolute, out var redirUri))
                return BadRequest(new { message = "Invalid redirection URL" });

            var allowed = _options.AllowedFrontendDomains ?? Array.Empty<string>();
            if (!allowed.Any(a => string.Equals(a, redirUri.Host, StringComparison.OrdinalIgnoreCase)))
                return BadRequest(new { message = "Invalid redirection URL" });

            JsonElement result;
            try
            {
                result = await _paymob.CreateIntentionAsync(req);
            }
            catch (HttpRequestException exception)
            {
                return BadRequest(new { message = exception.Message });
            }
            var clientSecret = result.GetProperty("client_secret").GetString();

            return Ok(new CreatePaymentResponse
            {
                ClientSecret = clientSecret!,
                PublicKey = _options.PublicKey,
                UnifiedCheckoutUrl =
                    $"https://eg.checkout.paymob.com/?publicKey={_options.PublicKey}&clientSecret={clientSecret}"
            });
        }

        // webhook endpoint called by Paymob. Keep it minimal and allowed to be anonymous.
        [HttpPost("webhook")]
        [AllowAnonymous]
        public async Task<IActionResult> Webhook()
        {
            using var reader = new System.IO.StreamReader(Request.Body);
            var body = await reader.ReadToEndAsync();

            var ok = await _paymobConcrete.ProcessWebhookAsync(body, Request.Query);
            if (!ok) return Unauthorized();

            return Ok();
        }

        [HttpPost("confirm")]
        [AllowAnonymous]
        public async Task<IActionResult> ConfirmRedirect()
        {
            var ok = await _paymobConcrete.ProcessRedirectAsync(Request.Query);
            return ok ? Ok() : Unauthorized();
        }
    }
}
