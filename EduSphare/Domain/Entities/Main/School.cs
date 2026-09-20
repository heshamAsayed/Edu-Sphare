namespace EduSphare.Domain.Entities.Main
{
    public class School
    {
        public string Id { get; set; }
        public string Name { get; set; } = string.Empty;
        // Path to image file stored for this school (relative to site root), e.g. /resources/images/{file}
        public string ImagePath { get; set; } = string.Empty;

        // Navigation properties
        public ICollection<Stage>? Stages { get; set; }

        private School()
        {
        }

        public School(string name)
        {
            Id = Guid.NewGuid().ToString();
            Name = name;
            ImagePath = string.Empty;
            Stages = new List<Stage>();
        }
    }
}
