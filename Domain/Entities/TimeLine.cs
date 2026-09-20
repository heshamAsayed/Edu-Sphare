namespace EduSphare.Domain.Entities
{
    public class TimeLine
    {
        public string Id { get; set; }
        public string CurrentCourseId { get; set; } = string.Empty;
        public DateTime NextCourseDate { get; set; }
        public string NextCourseId { get; set; } = string.Empty;

        // Foreign Key - One-to-One relationship
        public Course? NextCourse { get; set; }
        public Course? CurrentCourse { get; set; }

        public TimeLine()
        {
        }

        public TimeLine(string currentCourseId, DateTime nextCourseDate, string nextCourseId)
        {
            Id = Guid.NewGuid().ToString();
            CurrentCourseId = currentCourseId;
            NextCourseDate = nextCourseDate;
            NextCourseId = nextCourseId;
        }
    }
}
