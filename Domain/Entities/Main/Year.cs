namespace EduSphare.Domain.Entities.Main
{
    public class Year
    {
        public string Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int OrderNo { get; set; }
        public string StageId { get; set; } = string.Empty;

        // Foreign Key
        public Stage? Stage { get; set; }

        // Navigation properties
        //public ICollection<Student>? Students { get; set; }
        //public ICollection<Course>? Courses { get; set; }

        private Year()
        {
        }

        public Year(string name, int orderNo, string stageId)
        {
            Id = Guid.NewGuid().ToString();
            Name = name;
            OrderNo = orderNo;
            StageId = stageId;
        }
    }
}
