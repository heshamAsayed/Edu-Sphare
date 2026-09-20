namespace EduSphare.Application.DTOs.Courses;
public class VideoWatchResponseDto
{
	public string VideoId { get; set; } = string.Empty;
	public string StudentId { get; set; } = string.Empty;
	public bool IsWatched { get; set; }
	public DateTime WatchedAt { get; set; }
	public bool IsAbsent { get; set; }
}
