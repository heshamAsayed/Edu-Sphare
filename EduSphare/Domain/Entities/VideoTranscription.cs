using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EduSphare.Domain.Entities
{
    public class VideoTranscription
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public string VideoId { get; set; } = string.Empty;

        [ForeignKey(nameof(VideoId))]
        public Video? Video { get; set; }

        /// <summary>
        /// Full transcribed text extracted from video audio.
        /// </summary>
        public string TranscriptionText { get; set; } = string.Empty;

        /// <summary>
        /// Empty column reserved for saving AI generated questions later.
        /// </summary>
        public string? GeneratedQuestionsJson { get; set; }

        /// <summary>
        /// Status of transcription: Pending, Processing, Completed, Failed
        /// </summary>
        public string Status { get; set; } = "Pending";

        public string? ErrorMessage { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? CompletedAt { get; set; }
    }
}
