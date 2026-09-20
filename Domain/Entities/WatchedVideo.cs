using EduSphare.Domain.Entities.Users;

namespace EduSphare.Domain.Entities
{
    public class WatchedVideo
    {
        public string Id { get; set; }
        public string StudentId { get; set; } = string.Empty;
        public string VideoId { get; set; } = string.Empty;
        public bool WatchedBoolean { get; set; } = false;
        public decimal Degree { get; set; }
        public decimal FocusPercent { get; set; }
        public DateTime WatchedAt { get; set; }
        // Attendance is deliberately independent from playback/completion.
        // Attendance is deliberately independent from playback/completion.
        public bool IsAbsent { get; set; }
        public DateTime? AbsentMarkedAt { get; set; }
        // Immutable attempt evidence: what the student chose and what was marked correct.
        public string? QuizAnswersJson { get; set; }
        public string? QuizResultsJson { get; set; }
        public DateTime? QuizCompletedAt { get; set; }

        // Foreign Keys
        public Student? Student { get; set; }
        public Video? Video { get; set; }

        private WatchedVideo()
        {
        }

        public WatchedVideo(string studentId, string videoId, bool watchedBoolean, decimal degree, decimal focusPercent, DateTime watchedAt)
        {
            Id = Guid.NewGuid().ToString();
            StudentId = studentId;
            VideoId = videoId;
            WatchedBoolean = watchedBoolean;
            Degree = degree;
            FocusPercent = focusPercent;
            WatchedAt = watchedAt;
        }
    }
}
