using EduSphare.Domain.Entities.Main;

namespace EduSphare.Domain.Entities.Users
{
    public class Student
    {
        // Shared primary key: this table is the student's profile for an ApplicationUser.
        public string ApplicationUserId { get; set; } = string.Empty;
        public DateTime JoinDate { get; set; }
        public string YearId { get; set; } = string.Empty;
        public string StageId { get; set; } = string.Empty;
        public string SchoolId { get; set; } = string.Empty;

        public ApplicationUser ApplicationUser { get; set; } = null!;
        public Year? Year { get; set; }
        public Stage? Stage { get; set; }
        public School? School { get; set; }

        // Navigation properties
        public ICollection<StudentCoursePaid>? StudentCoursePaids { get; set; }
        public ICollection<WatchedVideo>? WatchedVideos { get; set; }

        private Student()
        {
        }

        public Student(DateTime joinDate, string yearId, string stageId, string schoolId, string applicationUserId)
        {
            JoinDate = joinDate;
            YearId = yearId;
            StageId = stageId;
            SchoolId = schoolId;
            ApplicationUserId = applicationUserId;
            StudentCoursePaids = new List<StudentCoursePaid>();
            //WatchedVideos = new List<WatchedVideo>();
        }
    }
}
