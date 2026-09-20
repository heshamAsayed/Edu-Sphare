using EduSphare.Application.DTOs.Ai;

namespace EduSphare.Application.Services.Interface.Ai
{
    public interface IAiAttentionQuestionService
    {
        /// <summary>
        /// توليد سؤال واحد فقط لقياس انتباه الطالب، حيث تؤخذ بيانات الطالب وسياقه تلقائياً من المستخدم الحالي والنظام دون إدخال من المستعمل.
        /// </summary>
        /// <param name="cancellationToken">إلغاء العملية</param>
        /// <returns>نموذج السؤال الناتج (AttentionQuestionResponseDto)</returns>
        Task<AttentionQuestionResponseDto?> GenerateAttentionQuestionAsync(CancellationToken cancellationToken = default);

        /// <summary>
        /// توليد 10 أسئلة مختلطة (MCQ + TrueFalse) من نص تفريغ الفيديو لاختبار نهاية الدرس.
        /// </summary>
        Task<List<VideoQuizQuestionDto>?> GenerateVideoQuizAsync(string transcriptionText, CancellationToken cancellationToken = default);
    }
}
