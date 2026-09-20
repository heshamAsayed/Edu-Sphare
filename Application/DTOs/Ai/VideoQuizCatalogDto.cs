namespace EduSphare.Application.DTOs.Ai
{
    /// <summary>
    /// سؤال واحد مع إجابته الصحيحة ضمن كتالوج الأسئلة
    /// </summary>
    public class QuizCatalogQuestionDto
    {
        public int Index { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Question { get; set; } = string.Empty;
        public List<string>? Options { get; set; }
        public object? CorrectAnswer { get; set; }
    }

    /// <summary>
    /// أسئلة فيديو واحد مع معلوماته
    /// </summary>
    public class VideoQuizCatalogDto
    {
        public string VideoId { get; set; } = string.Empty;
        public string VideoTitle { get; set; } = string.Empty;
        public int SortOrder { get; set; }
        public bool HasQuestions { get; set; }
        public List<QuizCatalogQuestionDto> Questions { get; set; } = [];
    }

    /// <summary>
    /// الرد الكامل لكتالوج الأسئلة
    /// </summary>
    public class VideoQuizCatalogResponseDto
    {
        public int TotalVideos { get; set; }
        public int VideosWithQuestions { get; set; }
        public int TotalQuestions { get; set; }
        public List<VideoQuizCatalogDto> Videos { get; set; } = [];
    }
}
