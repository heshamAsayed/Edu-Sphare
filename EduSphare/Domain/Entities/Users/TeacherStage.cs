using EduSphare.Domain.Entities.Main;

namespace EduSphare.Domain.Entities.Users
{
    public class TeacherStage
    {
        public string TeacherId { get; set; } = string.Empty;
        public Teacher Teacher { get; set; } = null!;

        public string StageId { get; set; } = string.Empty;
        public Stage Stage { get; set; } = null!;

        public TeacherStage() { }

        public TeacherStage(string teacherId, string stageId)
        {
            TeacherId = teacherId;
            StageId = stageId;
        }
    }
}
