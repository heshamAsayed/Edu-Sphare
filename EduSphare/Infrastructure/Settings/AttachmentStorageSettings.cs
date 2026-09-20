namespace EduSphare.Infrastructure.Settings;

public class AttachmentStorageSettings
{
    public const string SectionName = "AttachmentStorage";
    public string RelativePath { get; set; } = "resources";
    public string PublicBaseUrl { get; set; } = "/resources";
}
