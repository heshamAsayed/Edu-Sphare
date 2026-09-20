using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;

namespace EduSphare.Application.Services;

public class ProgressStreamContent : HttpContent
{
    private const int DefaultBufferSize = 81920;
    private readonly Stream _content;
    private readonly int _bufferSize;
    private readonly string _uploadId;
    private readonly string _status;
    private readonly long _totalLength;

    public ProgressStreamContent(Stream content, string uploadId)
        : this(content, DefaultBufferSize, uploadId, "UploadingToBunny")
    {
    }

    public ProgressStreamContent(Stream content, string uploadId, string status)
        : this(content, DefaultBufferSize, uploadId, status) { }

    public ProgressStreamContent(Stream content, int bufferSize, string uploadId, string status = "UploadingToBunny")
    {
        _content = content ?? throw new ArgumentNullException(nameof(content));
        if (bufferSize <= 0) throw new ArgumentOutOfRangeException(nameof(bufferSize));

        _bufferSize = bufferSize;
        _uploadId = uploadId;
        _status = status;
        _totalLength = content.CanSeek ? content.Length : 0;
        Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
    }

    protected override async Task SerializeToStreamAsync(Stream stream, TransportContext? context)
    {
        var buffer = new byte[_bufferSize];
        long totalBytesRead = 0;
        int bytesRead;

        UploadProgressTracker.UpdateProgress(_uploadId, 0, _totalLength, _status);

        while ((bytesRead = await _content.ReadAsync(buffer, 0, buffer.Length)) > 0)
        {
            await stream.WriteAsync(buffer, 0, bytesRead);
            totalBytesRead += bytesRead;
            UploadProgressTracker.UpdateProgress(_uploadId, totalBytesRead, _totalLength, _status);
        }

        UploadProgressTracker.UpdateProgress(_uploadId, _totalLength, _totalLength, "Processing");
    }

    protected override bool TryComputeLength(out long length)
    {
        length = _totalLength;
        return true;
    }
}
