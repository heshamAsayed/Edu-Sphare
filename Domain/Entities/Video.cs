namespace EduSphare.Domain.Entities
{
    public class Video
    {
        public string Id { get; set; }
        public int SortOrder { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string Resource { get; set; } = string.Empty;
        public string BankQuotationsPath { get; set; } = string.Empty;
        public string CourseId { get; set; } = string.Empty;

        // Bunny Stream Integration
        public string? BunnyVideoId { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Tags { get; set; }
        public int AvailabilityDays { get; set; } = 1;
        // A lesson has one extracted text and its current Deepgram state.
        public string TranscriptionText { get; set; } = string.Empty;
        public string TranscriptionStatus { get; set; } = "Pending";
        public string? TranscriptionError { get; set; }
        public string? GeneratedQuestionsJson { get; set; }

        // Foreign Key
        public Course? Course { get; set; }

        // Navigation properties
        public ICollection<WatchedVideo>? WatchedVideos { get; set; }
        public ICollection<VideoAttachment>? Attachments { get; set; }

        private Video()
        {
        }

        public void AddWatchedVideo(string studentId, string videoId, bool watchedBoolean, decimal degree, decimal focusPercent, DateTime watchedAt)
        {
            WatchedVideo watchedVideo = new WatchedVideo(studentId, videoId, watchedBoolean, degree, focusPercent, watchedAt);
            if (WatchedVideos == null)
            {
                WatchedVideos = new List<WatchedVideo>();
            }
            WatchedVideos.Add(watchedVideo);
        }

        public Video(int sortOrder, DateTime createdAt, string resource, string bankQuotationsId, string courseId)
        {
            Id = Guid.NewGuid().ToString();
            SortOrder = sortOrder;
            CreatedAt = createdAt;
            Resource = resource;
            BankQuotationsPath = bankQuotationsId;
            CourseId = courseId;
            WatchedVideos = new List<WatchedVideo>();
        }
    }
}
