namespace EduSphare.Application.Services.Interface.Ai
{
    public interface IVideoTranscriptionQueue
    {
        void QueueVideoForTranscription(string videoId, string videoFilePathOrUrl);
        Task<Tuple<string, string>?> DequeueAsync(CancellationToken cancellationToken);
    }
}
