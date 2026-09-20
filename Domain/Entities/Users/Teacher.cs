using EduSphare.Domain.Entities.Main;

namespace EduSphare.Domain.Entities.Users
{
    public class Teacher
    {
        // Shared primary key: this table is the teacher's profile for an ApplicationUser.
        public string ApplicationUserId { get; set; } = string.Empty;

        public ApplicationUser ApplicationUser { get; set; } = null!;

        // School & Stages relations
        public string? SchoolId { get; set; }
        public School? School { get; set; }
        public ICollection<TeacherStage> TeacherStages { get; set; } = new List<TeacherStage>();

        // Navigation properties
        public ICollection<StudentCoursePaid>? StudentCoursePaids { get; set; }
        public ICollection<Course>? Courses { get; set; }

        private Teacher()
        {
        }

        public Teacher(string applicationUserId, string? schoolId = null)
        {
            ApplicationUserId = applicationUserId;
            SchoolId = schoolId;
            StudentCoursePaids = new List<StudentCoursePaid>();
            Courses = new List<Course>();
            TeacherStages = new List<TeacherStage>();
        }
    }
}

