using System.Threading.Channels;
using EduSphare.Application.Services.Interface.Ai;
using Microsoft.Extensions.Logging;

namespace EduSphare.Infrastructure.Services.Ai
{
    public class VideoTranscriptionQueue : IVideoTranscriptionQueue
    {
        private readonly Channel<Tuple<string, string>> _queue;
        private readonly ILogger<VideoTranscriptionQueue> _logger;

        public VideoTranscriptionQueue(ILogger<VideoTranscriptionQueue> logger)
        {
            _logger = logger;
            // Channel غير محدد الحجم مع ضمان التتابع بالتسلسل
            _queue = Channel.CreateUnbounded<Tuple<string, string>>(new UnboundedChannelOptions
            {
                SingleReader = true,
                SingleWriter = false
            });
        }

        public void QueueVideoForTranscription(string videoId, string videoFilePathOrUrl)
        {
            if (string.IsNullOrWhiteSpace(videoId)) return;

            _queue.Writer.TryWrite(Tuple.Create(videoId, videoFilePathOrUrl ?? string.Empty));
            _logger.LogInformation("Video {VideoId} queued successfully for sequential background transcription.", videoId);
        }

        public async Task<Tuple<string, string>?> DequeueAsync(CancellationToken cancellationToken)
        {
            return await _queue.Reader.ReadAsync(cancellationToken);
        }
    }
}
