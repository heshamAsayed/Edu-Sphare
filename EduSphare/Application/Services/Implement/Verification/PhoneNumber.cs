using EduSphare.Application.Services.Interface.Verification;
using EduSphare.Domain.Entities.Verification;
using EduSphare.Infrastructure.UnitOfWork;
using System.Security.Cryptography;
using System.Linq;
using System.Threading.Tasks;

namespace EduSphare.Application.Services.Implement.Verification
{
    public class PhoneNumber(
        IUnitOfWork _unitOfWork,
        HttpClient _httpClient,
        IConfiguration _configuration
        ) : IPhoneNumber
    {
        private string GenerateOTP()
        {
            string otp = RandomNumberGenerator
                .GetInt32(100000, 1000000)
                .ToString();

            return otp;

        }
        private async Task SaveOTP(string phoneNumber, string otp)
        {
            var phoneVerification = new PhoneVerification(phoneNumber);
            phoneVerification.OTPHash = BCrypt.Net.BCrypt.HashPassword(otp);
            // keep entity defaults (constructor sets ExpirationTime default, IsUsed=false)
            _unitOfWork.PhoneVerifications.Add(phoneVerification);
            await _unitOfWork.SaveChangesAsync();
        }
        private Task<string> SendAsync(string phoneNumber, string message)
        {
            // In testing mode we don't actually call an SMS provider.
            // Return a simple message that the frontend can display.
            return Task.FromResult($"Test Message sent to {phoneNumber}: {message}");
        }

        public async Task<string> SendVerificationCodeAsync(string phoneNumber)
        {
            // Implement your logic to send a verification code to the phone number            
            var otp = GenerateOTP();
            await SaveOTP(phoneNumber, otp);

            return await SendAsync(phoneNumber, $"Your verification code is: {otp}");
        }

        public async Task<bool> VerifyCodeAsync(string userId, string phoneNumber, string code)
        {
            // Implement your logic to verify the code for the phone number
            if (string.IsNullOrEmpty(phoneNumber) || string.IsNullOrEmpty(code))
                throw new ArgumentNullException("phone number or code is empty");

            var phoneVerification = await _unitOfWork.PhoneVerifications.GetManyByQueryAsync(pv => pv.PhoneNumber == phoneNumber);
            var verification = phoneVerification
                .OrderByDescending(pv => pv.ExpirationTime)
                .FirstOrDefault();

            if (verification == null)
                throw new BadHttpRequestException("Invalid or expired code.");

            // If already used -> reject
            if (verification.IsUsed)
                throw new BadHttpRequestException("Code already used.");

            // Expiration check
            if (verification.ExpirationTime < DateTime.UtcNow)
            {
                var expiredAt = verification.ExpirationTime.ToUniversalTime();
                var ago = DateTime.UtcNow - expiredAt;
                throw new BadHttpRequestException($"Code expired at {expiredAt:u} (expired {FormatDuration(ago)} ago).");
            }

            // Verify OTP
            if (!BCrypt.Net.BCrypt.Verify(code, verification.OTPHash))
            {
                // increment attempts counter
                verification.Attampts += 1;
                _unitOfWork.PhoneVerifications.Update(verification);
                await _unitOfWork.SaveChangesAsync();
                throw new BadHttpRequestException($"Invalid code. Attempts: {verification.Attampts}.");
            }

            // mark as used
            verification.IsUsed = true;

            // ensure detached entity changes are tracked for save
            _unitOfWork.PhoneVerifications.Update(verification);

            // if a user id was provided and the user exists, mark phone confirmed
            if (!string.IsNullOrEmpty(userId))
            {
                var user = await _unitOfWork.Users.GetByIdAsync(userId);
                if (user != null)
                {
                    user.PhoneNumberConfirmed = true;
                }
            }

            await _unitOfWork.SaveChangesAsync();

            return true;
        }

        private static string FormatDuration(TimeSpan ts)
        {
            if (ts.TotalHours >= 1)
                return $"{(int)ts.TotalHours}h {ts.Minutes}m";
            if (ts.TotalMinutes >= 1)
                return $"{(int)ts.TotalMinutes}m {ts.Seconds}s";
            return $"{ts.Seconds}s";
        }
    }
}
