using System.Text.Json.Serialization;

namespace EduSphare.Application.DTOs.Ai
{
    public class VideoQuizResultDto
    {
        [JsonPropertyName("videoId")]
        public string VideoId { get; set; } = string.Empty;

        /// <summary>
        /// إجابات الطالب مرتبة حسب فهرس السؤال (0-based).
        /// لقيمة MCQ: رقم الاختيار، ولـ TrueFalse: true/false.
        /// </summary>
        [JsonPropertyName("answers")]
        public List<object?> Answers { get; set; } = new();
    }
}
