using EduSphare.Domain.Entities.Users;

namespace EduSphare.Domain.Entities
{
    public class StudentCoursePaid
    {
        public string Id { get; set; }
        public string StudentId { get; set; } = string.Empty;
        public string CourseId { get; set; } = string.Empty;
        public string TeacherId { get; set; } = string.Empty;
        public DateTime PaidAt { get; set; }
        public decimal Price { get; set; }
        public string CodePaid { get; set; } = string.Empty;
        public string PaymentMethod { get; set; } = string.Empty;
        // Indicates whether this payment/enrollment is active/paid
        public bool IsPaid { get; set; }

        // Foreign Keys
        public Student? Student { get; set; }
        public Course? Course { get; set; }
        public Teacher? Teacher { get; set; }
        public ICollection<Video>? Videos { get; set; }
        //public ICollection<WatchedVideo>? WatchedVideos { get; set; }


        private StudentCoursePaid()
        {
        }

        public StudentCoursePaid(string studentId, string courseId, string teacherId, DateTime paidAt, decimal price, string codePaid, string paymentMethod)
        {
            Id = Guid.NewGuid().ToString();
            StudentId = studentId;
            CourseId = courseId;
            TeacherId = teacherId;
            PaidAt = paidAt;
            Price = price;
            CodePaid = codePaid;
            PaymentMethod = paymentMethod;
            IsPaid = true;
        }
    }
}
