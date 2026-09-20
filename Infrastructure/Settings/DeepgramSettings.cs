namespace EduSphare.Infrastructure.Settings;

public class DeepgramSettings
{
    public const string SectionName = "DeepgramSetting";

    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = "nova-3";
    public string Language { get; set; } = "ar";
    public bool SmartFormat { get; set; } = true;
    public bool Punctuate { get; set; } = true;
}
