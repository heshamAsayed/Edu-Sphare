namespace EduSphare.Domain.Entities.Verification
{
    public class PhoneVerification
    {
        public string Id { get; set; }
        public string PhoneNumber { get; set; } = string.Empty;
        public string OTPHash { get; set; } = string.Empty;
        public DateTime ExpirationTime { get; set; }
        public int Attampts { get; set; } = 0;
        public bool IsUsed { get; set; }

        private PhoneVerification() { }
        public PhoneVerification(string phoneNumber, int ExpirationTimeByMinutes = 120)
        {
            Id = Guid.NewGuid().ToString();
            PhoneNumber = phoneNumber;
            ExpirationTime = DateTime.Now.AddMinutes(ExpirationTimeByMinutes);
            IsUsed = false;
        }

        public void UseOTP() => IsUsed = true;


        //public string UserId { get; set; } = string.Empty;
        //public ApplicationUser User { get; set; } = null!;

    }
}
