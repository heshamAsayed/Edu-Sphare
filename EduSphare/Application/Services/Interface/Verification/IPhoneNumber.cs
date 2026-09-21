namespace EduSphare.Application.Services.Interface.Verification
{
    public interface IPhoneNumber
    {
        Task<string> SendVerificationCodeAsync(string phoneNumber);
        Task<bool> VerifyCodeAsync(string userId, string phoneNumber, string code);
    }
}
