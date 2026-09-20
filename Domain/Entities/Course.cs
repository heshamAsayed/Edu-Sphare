using EduSphare.Domain.Entities.Main;
using EduSphare.Domain.Entities.Users;

namespace EduSphare.Domain.Entities
{
    public class Course
    {
        public string Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int SortOrder { get; set; }
        // Path to course image (relative to site root), e.g. /resources/images/{file}
        public string ImagePath { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public Decimal Price { get; set; }
        public string YearId { get; set; } = string.Empty;
        public string StageId { get; set; } = string.Empty;
        // Foreign Key
        public Year? Year { get; set; }
        public Stage? Stage { get; set; }


        // Navigation properties
        public ICollection<StudentCoursePaid>? StudentCoursePaids { get; set; }
        public ICollection<Teacher> teachers { get; set; }
        public ICollection<Video>? Videos { get; set; }
        public TimeLine? TimeLine { get; set; }

        private Course()
        {
        }

        public Course(string name, DateTime createdAt, string yearId, string stageId, Decimal price)
        {
            Id = Guid.NewGuid().ToString();
            Name = name;
            Description = string.Empty;
            SortOrder = 0;
            ImagePath = string.Empty;
            CreatedAt = createdAt;
            YearId = yearId;
            StageId = stageId;
            Price = price;
            StudentCoursePaids = new List<StudentCoursePaid>();
            Videos = new List<Video>();
            teachers = new List<Teacher>();
        }


        public void PaidCourse(StudentCoursePaid studentCoursePaid)
        {
            if (StudentCoursePaids == null)
            {
                StudentCoursePaids = new List<StudentCoursePaid>();
            }
            StudentCoursePaids.Add(studentCoursePaid);
        }
    }
}
