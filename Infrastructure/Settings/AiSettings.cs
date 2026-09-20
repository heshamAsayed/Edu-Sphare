namespace EduSphare.Infrastructure.Settings;

/// <summary>
/// Configuration settings for AI Question Generation Service.
/// Bound from appsettings.json["AiSetting"]
/// </summary>
public class AiSettings
{
    public const string SectionName = "AiSetting";

    /// <summary>
    /// AI Provider identifier (e.g. "OpenRouter", "OpenAI", "Gemini", "Azure")
    /// </summary>
    public string Provider { get; set; } = "OpenRouter";

    /// <summary>
    /// Base URL for the AI API (e.g. "https://openrouter.ai/api/v1/" or "https://api.openai.com/v1/")
    /// </summary>
    public string BaseUrl { get; set; } = string.Empty;

    /// <summary>
    /// API Access Key for authentication.
    /// </summary>
    public string AccessKey { get; set; } = string.Empty;

    /// <summary>
    /// Model name to be used for prompt generation (e.g. "google/gemini-2.0-flash-lite-preview-02-05:free", "gpt-4o-mini", etc.)
    /// </summary>
    public string ModelName { get; set; } = string.Empty;

    /// <summary>
    /// Temperature parameter controlling randomness (0.0 to 1.0)
    /// </summary>
    public double Temperature { get; set; } = 0.7;
}
