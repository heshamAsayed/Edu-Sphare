using System.Text.Json.Serialization;

namespace EduSphare.Application.DTOs.Ai
{
    public class AttentionQuestionResponseDto
    {
        /// <summary>
        /// نوع السؤال: "MCQ" أو "TrueFalse"
        /// </summary>
        [JsonPropertyName("type")]
        public string Type { get; set; } = string.Empty;

        /// <summary>
        /// نص السؤال باللغة العربية
        /// </summary>
        [JsonPropertyName("question")]
        public string Question { get; set; } = string.Empty;

        /// <summary>
        /// الاختيارات (في حالة نوع MCQ) - تحتوي على 4 عناصر
        /// </summary>
        [JsonPropertyName("options")]
        public List<string>? Options { get; set; }

        /// <summary>
        /// الإجابة الصحيحة. 
        /// يمكن أن تكون int (index الاختيار 0..3) في حالة MCQ، 
        /// أو bool (true/false) في حالة TrueFalse.
        /// </summary>
        [JsonPropertyName("correctAnswer")]
        public object? CorrectAnswer { get; set; }
    }
}
