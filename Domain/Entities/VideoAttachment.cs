namespace EduSphare.Domain.Entities;

public class VideoAttachment
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string VideoId { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public string StoredFileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long Length { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Video? Video { get; set; }
}
