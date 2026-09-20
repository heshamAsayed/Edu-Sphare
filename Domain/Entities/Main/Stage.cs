namespace EduSphare.Domain.Entities.Main
{
    public class Stage
    {
        public string Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int OrderNo { get; set; }
        public string SchoolId { get; set; } = string.Empty;

        // Foreign Key
        public School? School { get; set; }

        // Navigation properties
        public ICollection<Year>? Years { get; set; }

        private Stage()
        {
        }

        public Stage(string name, int orderNo, string schoolId)
        {
            Id = Guid.NewGuid().ToString();
            Name = name;
            OrderNo = orderNo;
            SchoolId = schoolId;
            Years = new List<Year>();
        }
    }
}
