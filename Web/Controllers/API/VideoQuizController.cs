using System.Text.Json;
using EduSphare.Application.DTOs.Ai;
using EduSphare.Application.Services.Interface.Ai;
using EduSphare.Application.Services.Interface.Auth;
using EduSphare.Domain.Entities;
using EduSphare.Infrastructure.Services.Ai;
using EduSphare.Infrastructure.UnitOfWork;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduSphare.Web.Controllers.API
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class VideoQuizController : ControllerBase
    {
        private readonly IAiAttentionQuestionService _aiService;
        private readonly IUnitOfWork _uow;
        private readonly ICurrentUserService _currentUserService;
        private readonly ILogger<VideoQuizController> _logger;

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true
        };

        public VideoQuizController(
            IAiAttentionQuestionService aiService,
            IUnitOfWork uow,
            ICurrentUserService currentUserService,
            ILogger<VideoQuizController> logger)
        {
            _aiService = aiService;
            _uow = uow;
            _currentUserService = currentUserService;
            _logger = logger;
        }

        /// <summary>
        /// توليد أو جلب الأسئلة المخزّنة لاختبار نهاية الفيديو.
        /// GET: /api/VideoQuiz/generate?videoId=xxx
        /// </summary>
        [HttpGet("generate")]
        public async Task<IActionResult> Generate([FromQuery] string videoId, CancellationToken cancellationToken)
        {
            var studentId = _currentUserService.UserId;
            if (string.IsNullOrWhiteSpace(studentId))
                return Unauthorized(new { message = "المستخدم غير مسجل الدخول." });

            if (string.IsNullOrWhiteSpace(videoId))
                return BadRequest(new { message = "videoId مطلوب." });

            try
            {
                var transcription = await _uow.Videos.GetByIdAsync(videoId);
                if (transcription == null || string.IsNullOrWhiteSpace(transcription.TranscriptionText))
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "تفريغ الفيديو غير متوفر بعد. لا يمكن إنشاء الاختبار."
                    });
                }

                // استخدام الكاش إن وُجد
                if (!string.IsNullOrWhiteSpace(transcription.GeneratedQuestionsJson))
                {
                    var cached = JsonSerializer.Deserialize<List<VideoQuizQuestionDto>>(
                        transcription.GeneratedQuestionsJson, JsonOptions);

                    if (cached != null && cached.Count > 0)
                    {
                        return Ok(new { success = true, cached = true, questions = cached });
                    }
                }

                var questions = await _aiService.GenerateVideoQuizAsync(
                    transcription.TranscriptionText, cancellationToken);

                if (questions == null || questions.Count == 0)
                {
                    return StatusCode(500, new
                    {
                        success = false,
                        message = "فشل في توليد أسئلة الاختبار من الذكاء الاصطناعي."
                    });
                }

                transcription.GeneratedQuestionsJson = JsonSerializer.Serialize(questions, JsonOptions);
                _uow.Videos.Update(transcription);
                await _uow.SaveChangesAsync();

                return Ok(new { success = true, cached = false, questions });
            }
            catch (AiQuotaExceededException ex)
            {
                return StatusCode(429, new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating video quiz for video {VideoId}", videoId);
                return StatusCode(500, new
                {
                    success = false,
                    message = "حدث خطأ غير متوقع أثناء توليد الاختبار.",
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// استلام إجابات الطالب، حساب النتيجة، وحفظها في WatchedVideo.Degree.
        /// POST: /api/VideoQuiz/submit
        /// </summary>
        [HttpPost("submit")]
        public async Task<IActionResult> Submit([FromBody] VideoQuizResultDto request)
        {
            var studentId = _currentUserService.UserId;
            if (string.IsNullOrWhiteSpace(studentId))
                return Unauthorized(new { message = "المستخدم غير مسجل الدخول." });

            if (request == null || string.IsNullOrWhiteSpace(request.VideoId))
                return BadRequest(new { message = "بيانات غير صالحة." });

            var transcription = await _uow.Videos.GetByIdAsync(request.VideoId);
            if (transcription == null || string.IsNullOrWhiteSpace(transcription.GeneratedQuestionsJson))
            {
                return NotFound(new { success = false, message = "أسئلة الاختبار غير موجودة لهذا الفيديو." });
            }

            var questions = JsonSerializer.Deserialize<List<VideoQuizQuestionDto>>(
                transcription.GeneratedQuestionsJson, JsonOptions);

            if (questions == null || questions.Count == 0)
                return StatusCode(500, new { success = false, message = "تعذر قراءة أسئلة الاختبار المخزّنة." });

            int total = questions.Count;
            int correct = 0;
            var results = new List<object>();

            for (int i = 0; i < total; i++)
            {
                var question = questions[i];
                object? studentAnswer = (request.Answers != null && i < request.Answers.Count)
                    ? request.Answers[i]
                    : null;

                bool isCorrect = AnswersMatch(question, studentAnswer);
                if (isCorrect) correct++;

                results.Add(new
                {
                    index = i,
                    isCorrect,
                    correctAnswer = question.CorrectAnswer,
                    studentAnswer
                });
            }

            decimal scorePercent = total > 0
                ? Math.Round((decimal)correct / total * 100m, 2)
                : 0m;

            var watched = await _uow.WatchedVideos.GetByQuery(
                w => w.StudentId == studentId && w.VideoId == request.VideoId);
            var video = await _uow.Videos.GetByIdAsync(request.VideoId);
            if (video is null)
                return NotFound(new { success = false, message = "Video not found." });

            var completedAt = DateTime.UtcNow;
            var isLate = completedAt > video.CreatedAt.AddDays(video.AvailabilityDays);

            if (watched is null)
            {
                watched = new WatchedVideo(studentId, request.VideoId, true, scorePercent, 100.01m, completedAt)
                {
                    IsAbsent = isLate,
                    AbsentMarkedAt = isLate ? completedAt : null,
                };
                _uow.WatchedVideos.Add(watched);
            }
            else
            {
                watched.Degree = scorePercent;
                watched.WatchedBoolean = true;
                watched.WatchedAt = completedAt;
                if (!watched.IsAbsent && isLate)
                {
                    watched.IsAbsent = true;
                    watched.AbsentMarkedAt = completedAt;
                }
                // ميّز نتيجة الاختبار عن القيمة القديمة Degree=100 من MarkAsWatched
                if (watched.FocusPercent == 100m)
                    watched.FocusPercent = 100.01m;
                _uow.WatchedVideos.Update(watched);
            }

            watched.QuizAnswersJson = JsonSerializer.Serialize(request.Answers, JsonOptions);
            watched.QuizResultsJson = JsonSerializer.Serialize(results, JsonOptions);
            watched.QuizCompletedAt = DateTime.UtcNow;

            await _uow.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                correct,
                total,
                scorePercent,
                results
            });
        }

        /// <summary>
        /// إرجاع نتيجة اختبار الطالب المحفوظة (للتحقق إن كان قد أدّى الاختبار مسبقاً).
        /// GET: /api/VideoQuiz/score?videoId=xxx
        /// </summary>
        [HttpGet("score")]
        public async Task<IActionResult> GetScore([FromQuery] string videoId)
        {
            var studentId = _currentUserService.UserId;
            if (string.IsNullOrWhiteSpace(studentId))
                return Unauthorized(new { message = "المستخدم غير مسجل الدخول." });

            if (string.IsNullOrWhiteSpace(videoId))
                return BadRequest(new { message = "videoId مطلوب." });

            var watched = await _uow.WatchedVideos.GetByQuery(
                w => w.StudentId == studentId && w.VideoId == videoId);

            // Degree < 0 = لم يُقدَّم الاختبار.
            // Degree == 100 مع FocusPercent == 100 غالباً قيمة قديمة من MarkAsWatched (قبل ميزة الاختبار) وليست نتيجة اختبار.
            bool hasTaken = watched != null
                && watched.Degree >= 0
                && !(watched.Degree == 100m && watched.FocusPercent == 100m);

            return Ok(new
            {
                success = true,
                hasTaken,
                scorePercent = hasTaken ? watched!.Degree : (decimal?)null
            });
        }

        private static bool AnswersMatch(VideoQuizQuestionDto question, object? studentAnswer)
        {
            if (studentAnswer == null || question.CorrectAnswer == null)
                return false;

            if (question.Type.Equals("TrueFalse", StringComparison.OrdinalIgnoreCase))
            {
                bool? expected = ToBool(question.CorrectAnswer);
                bool? actual = ToBool(studentAnswer);
                return expected.HasValue && actual.HasValue && expected.Value == actual.Value;
            }

            // MCQ — قارن كفهارس رقمية
            int? expectedIndex = ToInt(question.CorrectAnswer);
            int? actualIndex = ToInt(studentAnswer);
            return expectedIndex.HasValue && actualIndex.HasValue && expectedIndex.Value == actualIndex.Value;
        }

        private static bool? ToBool(object value)
        {
            if (value is bool b) return b;
            if (value is JsonElement je)
            {
                if (je.ValueKind == JsonValueKind.True) return true;
                if (je.ValueKind == JsonValueKind.False) return false;
                if (je.ValueKind == JsonValueKind.String && bool.TryParse(je.GetString(), out var parsed))
                    return parsed;
            }

            if (value is string s && bool.TryParse(s, out var fromString))
                return fromString;

            return null;
        }

        private static int? ToInt(object value)
        {
            if (value is int i) return i;
            if (value is long l) return (int)l;
            if (value is decimal d) return (int)d;
            if (value is double dbl) return (int)dbl;
            if (value is JsonElement je)
            {
                if (je.ValueKind == JsonValueKind.Number && je.TryGetInt32(out var n))
                    return n;
                if (je.ValueKind == JsonValueKind.String && int.TryParse(je.GetString(), out var fromStr))
                    return fromStr;
            }

            if (value is string s && int.TryParse(s, out var parsed))
                return parsed;

            return null;
        }
    }
}
