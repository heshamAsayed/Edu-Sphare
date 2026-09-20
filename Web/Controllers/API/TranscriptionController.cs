using EduSphare.Infrastructure.Data;
using EduSphare.Application.Services.Interface.Ai;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduSphare.Web.Controllers.API
{
    [ApiController]
    [Route("api/[controller]")]
    public class TranscriptionController : ControllerBase
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly IVideoTranscriptionQueue _transcriptionQueue;
        public TranscriptionController(ApplicationDbContext dbContext, IVideoTranscriptionQueue transcriptionQueue)
        {
            _dbContext = dbContext;
            _transcriptionQueue = transcriptionQueue;
        }

        /// <summary>
        /// GET: /api/Transcription/video/{videoId}
        /// </summary>
        [HttpGet("video/{videoId}")]
        public async Task<IActionResult> GetVideoTranscription(string videoId)
        {
            if (string.IsNullOrWhiteSpace(videoId))
                return BadRequest(new { success = false, message = "Id الفيديو مطلوب." });

            var record = await _dbContext.Videos
                .FirstOrDefaultAsync(v => v.Id == videoId);

            if (record == null)
            {
                return NotFound(new { success = false, message = "لم يتم العثور على نص مفرغ لهذا الفيديو بعد." });
            }

            return Ok(new
            {
                success = true,
                videoId = record.Id,
                transcriptionText = record.TranscriptionText,
                status = record.TranscriptionStatus,
                createdAt = record.CreatedAt,
                errorMessage = record.TranscriptionError
            });
        }

        /// <summary>
        /// إعادة إرسال فيديو موجود للتفريغ عبر Deepgram + Bunny.
        /// POST: /api/Transcription/process-video/{videoId}
        /// </summary>
        [HttpPost("process-video/{videoId}")]
        public async Task<IActionResult> ProcessVideoTranscription(string videoId)
        {
            if (string.IsNullOrWhiteSpace(videoId))
                return BadRequest(new { success = false, message = "Id الفيديو مطلوب." });

            var video = await _dbContext.Videos.FirstOrDefaultAsync(v => v.Id == videoId);
            if (video == null)
                return NotFound(new { success = false, message = "الفيديو غير موجود." });

            if (string.IsNullOrWhiteSpace(video.BunnyVideoId))
                return BadRequest(new { success = false, message = "لا توجد نسخة Bunny متاحة لإعادة التفريغ." });

            video.TranscriptionStatus = "Pending";
            video.TranscriptionError = null;
            await _dbContext.SaveChangesAsync();
            // An empty source tells the worker to wait for Bunny then send its CDN URL to Deepgram.
            _transcriptionQueue.QueueVideoForTranscription(video.Id, string.Empty);
            return Accepted(new { success = true, message = "تمت جدولة إعادة التفريغ.", videoId = video.Id, status = video.TranscriptionStatus });
        }

        /*
         * Legacy Whisper direct upload endpoint (disabled — replaced by Deepgram + Bunny URL flow):
         *
         * [HttpPost("transcribe-file")]
         * public async Task<IActionResult> TranscribeDirectFile(IFormFile file, [FromQuery] string? videoId = null)
         * {
         *     ...
         *     string transcribedText = await _transcriptionService.TranscribeAsync(tempFilePath);
         *     ...
         * }
         */
    }
}
