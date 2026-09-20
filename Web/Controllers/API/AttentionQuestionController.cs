using EduSphare.Application.Services.Interface.Ai;
using EduSphare.Application.Services.Interface.Auth;
using EduSphare.Application.Services.Interface.Courses;
using EduSphare.Infrastructure.Services.Ai;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduSphare.Web.Controllers.API
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AttentionQuestionController : ControllerBase
    {
        private readonly IAiAttentionQuestionService _aiAttentionQuestionService;
        private readonly IVideos _videosService;
        private readonly ICurrentUserService _currentUserService;

        public AttentionQuestionController(
            IAiAttentionQuestionService aiAttentionQuestionService,
            IVideos videosService,
            ICurrentUserService currentUserService)
        {
            _aiAttentionQuestionService = aiAttentionQuestionService;
            _videosService = videosService;
            _currentUserService = currentUserService;
        }

        /// <summary>
        /// توليد سؤال واحد فقط عشوائي لقياس انتباه الطالب تلقائيًا بدون إدخال أي بيانات من المستخدم.
        /// </summary>
        [HttpGet("generate")]
        [HttpPost("generate")]
        public async Task<IActionResult> GenerateQuestion(CancellationToken cancellationToken)
        {
            try
            {
                var question = await _aiAttentionQuestionService.GenerateAttentionQuestionAsync(cancellationToken);
                if (question == null)
                {
                    return StatusCode(500, new { message = "فشل في توليد السؤال من الذكاء الاصطناعي." });
                }

                return Ok(question);
            }
            catch (AiQuotaExceededException ex)
            {
                return StatusCode(429, new { isSuccess = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { isSuccess = false, message = "حدث خطأ غير متوقع أثناء توليد السؤال.", error = ex.Message });
            }
        }

        public class RecordPenaltyRequest
        {
            public string VideoId { get; set; } = string.Empty;
            public int SecondsTaken { get; set; }
        }

        /// <summary>
        /// تسجيل ومراكمة نسبة عدم التركيز في قاعدة البيانات للطالب إذا تأخر في الإجابة بمعدل 10% لكل دقيقة.
        /// </summary>
        [HttpPost("record-penalty")]
        public async Task<IActionResult> RecordPenalty([FromBody] RecordPenaltyRequest request)
        {
            var studentId = _currentUserService.UserId;
            if (string.IsNullOrWhiteSpace(studentId))
            {
                return Unauthorized(new { message = "المستخدم غير مسجل الدخول." });
            }

            if (string.IsNullOrWhiteSpace(request.VideoId) || request.SecondsTaken <= 0)
            {
                return BadRequest(new { message = "بيانات غير صالحة." });
            }

            await _videosService.RecordAttentionPenaltyAsync(studentId, request.VideoId, request.SecondsTaken);
            return Ok(new { isSuccess = true, message = "تم تسجيل نسبة التأخير بنجاح." });
        }
    }
}
