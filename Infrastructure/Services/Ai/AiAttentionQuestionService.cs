using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using EduSphare.Application.DTOs.Ai;
using EduSphare.Application.Services.Interface.Ai;
using EduSphare.Application.Services.Interface.Auth;
using EduSphare.Infrastructure.Settings;
using EduSphare.Infrastructure.UnitOfWork;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace EduSphare.Infrastructure.Services.Ai
{
    public class AiQuotaExceededException : Exception
    {
        public AiQuotaExceededException(string message) : base(message) { }
    }

    public class AiAttentionQuestionService : IAiAttentionQuestionService
    {
        private readonly HttpClient _httpClient;
        private readonly AiSettings _aiSettings;
        private readonly ICurrentUserService _currentUserService;
        private readonly IUnitOfWork _uow;
        private readonly ILogger<AiAttentionQuestionService> _logger;

        private const string PromptTemplate = @"أنت نظام متخصص لتوليد أسئلة قصيرة جدًا لقياس انتباه الطالب أثناء مشاهدة فيديو تعليمي.

بيانات سياق الطالب الحالية من النظام:

اسمك يا طالب: {{StudentName}}
مرحلتك / صفك الدراسي: {{StageName}}
سنتك الدراسية: {{YearName}}
مدرستك: {{SchoolName}}
كورسك الحالي: {{CourseName}}
تاريخ اليوم: {{CurrentDate}}
اسم اليوم: {{CurrentDay}}
منطقتك / محافظتك: {{Region}}
دولتتك: {{Country}}

مهمتك:
قم بتوليد سؤال واحد فقط موجه للمخاطب المباشر (تخاطب الطالب بأسلوب ""أنت/أنتِ"" مثل: ""هل تدرس..."" أو ""ما اسم مدرستك؟"" أو ""أين تعيش؟""). لا تبرمج السؤال بأسلوب الغائب مطلقًا.

أنواع الأسئلة المسموح بها فقط:

1. MCQ (اختيار من متعدد):
يحتوي على:
- question: سؤال استفهامي موجه للمخاطب (مثال: ""ما هو اليوم الحالي؟"" أو ""ما اسم مدرستك؟"")
- options: مصفوفة تحتوي على 4 اختيارات متميزة.
- correctAnswer: رقم دليلي للاختيار الصحيح يبدأ من 0.

2. TrueFalse (صح أم خطأ):
يحتوي على:
- question: سؤال استفهامي صريح موجه للمخاطب يبدأ بـ ""هل"" (مثال: ""هل تدرس في مدرسة {{SchoolName}}؟"" أو ""هل اليوم هو يوم {{CurrentDay}}؟"")
- options: null (بدون اختيارات)
- correctAnswer: true إذا كانت الإجابة صحيحة، أو false إذا كانت خاطئة.

قواعد صارمة جدًا:
- خاطب الطالب مباشرة بالضمير الحاضر.
- يجب أن يكون نص question سؤالاً ينتهي بعلامة استفهام (؟).
- اختر نوع السؤال بشكل عشوائي بين MCQ و TrueFalse.
- أرجع كائن JSON صالح فقط دون أي نص أو شرح خارجي.

صيغ الـ JSON المطلوبة حصريًا:

في حالة MCQ:
{
  ""type"": ""MCQ"",
  ""question"": ""ما هو اليوم الحالي؟"",
  ""options"": [
    ""السبت"",
    ""الأحد"",
    ""الاثنين"",
    ""الثلاثاء""
  ],
  ""correctAnswer"": 0
}

في حالة TrueFalse:
{
  ""type"": ""TrueFalse"",
  ""question"": ""هل تدرس في مدرسة ألفا الجيزة؟"",
  ""options"": null,
  ""correctAnswer"": true
}

أرجع كائن JSON واحد فقط مطابق للمواصفات.";

        public AiAttentionQuestionService(
            HttpClient httpClient,
            IOptions<AiSettings> aiSettings,
            ICurrentUserService currentUserService,
            IUnitOfWork uow,
            ILogger<AiAttentionQuestionService> logger)
        {
            _httpClient = httpClient;
            _aiSettings = aiSettings.Value;
            _currentUserService = currentUserService;
            _uow = uow;
            _logger = logger;

            if (!string.IsNullOrWhiteSpace(_aiSettings.BaseUrl))
            {
                _httpClient.BaseAddress = new Uri(_aiSettings.BaseUrl.TrimEnd('/') + "/");
            }
        }

        public async Task<AttentionQuestionResponseDto?> GenerateAttentionQuestionAsync(CancellationToken cancellationToken = default)
        {
            var arabicCulture = new CultureInfo("ar-EG");
            var now = DateTime.Now;
            string currentDate = now.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            string currentDay = now.ToString("dddd", arabicCulture);
            string region = "القاهرة";
            string country = "مصر";

            string studentName = "الطالب العزيز";
            string stageName = "غير محدد";
            string yearName = "غير محدد";
            string schoolName = "غير محدد";
            string courseName = "عام";

            // جلب بيانات الطالب بسقف زمني قصير للغاية لتجنب أي تعليق من DB
            try
            {
                var userId = _currentUserService.UserId;
                if (!string.IsNullOrWhiteSpace(userId))
                {
                    var student = await _uow.Students.GetByQueryIncludingAsync(
                        s => s.ApplicationUserId == userId,
                        "ApplicationUser", "Stage", "Year", "School");

                    if (student != null)
                    {
                        if (!string.IsNullOrWhiteSpace(student.ApplicationUser?.Name))
                            studentName = student.ApplicationUser.Name;

                        if (student.Stage != null && !string.IsNullOrWhiteSpace(student.Stage.Name))
                            stageName = student.Stage.Name;

                        if (student.Year != null && !string.IsNullOrWhiteSpace(student.Year.Name))
                            yearName = student.Year.Name;

                        if (student.School != null && !string.IsNullOrWhiteSpace(student.School.Name))
                            schoolName = student.School.Name;

                        var enrollments = await _uow.Enrollments.GetManyByQueryAsync(e => e.StudentId == userId);
                        var latestEnrollment = enrollments.OrderByDescending(e => e.PaidAt).FirstOrDefault();
                        if (latestEnrollment != null && !string.IsNullOrWhiteSpace(latestEnrollment.CourseId))
                        {
                            var course = await _uow.Courses.GetByIdAsync(latestEnrollment.CourseId);
                            if (course != null && !string.IsNullOrWhiteSpace(course.Name))
                            {
                                courseName = course.Name;
                            }
                        }
                    }
                }
            }
            catch (Exception dbEx)
            {
                _logger.LogWarning(dbEx, "تعذر جلب بيانات الطالب التفصيلية من قاعدة البيانات فوراً. سيتم استخدام البيانات الافتراضية.");
            }

            string requestedType = (Random.Shared.Next(0, 2) == 0) ? "MCQ" : "TrueFalse";

            string finalPrompt = PromptTemplate
                .Replace("{{StudentName}}", studentName)
                .Replace("{{StageName}}", stageName)
                .Replace("{{YearName}}", yearName)
                .Replace("{{SchoolName}}", schoolName)
                .Replace("{{CourseName}}", courseName)
                .Replace("{{CurrentDate}}", currentDate)
                .Replace("{{CurrentDay}}", currentDay)
                .Replace("{{Region}}", region)
                .Replace("{{Country}}", country)
                + $"\n\n[تنبيه ملزم]: المطلوب حصراً في هذا الطلب هو توليد سؤال من نوع: ({requestedType}).";

            // ضمان وجود اسم نموذج صالح ومجاني في OpenRouter
            string modelToUse = _aiSettings.ModelName;
            if (string.IsNullOrWhiteSpace(modelToUse))
            {
                modelToUse = "openrouter/free";
            }

            var requestBody = new
            {
                model = modelToUse,
                temperature = _aiSettings.Temperature > 0 ? _aiSettings.Temperature : 0.7,
                messages = new[]
                {
                    new { role = "user", content = finalPrompt }
                }
            };

            string jsonPayload = JsonSerializer.Serialize(requestBody);
            string responseBody = string.Empty;

            try
            {
                for (int attempt = 1; attempt <= 2; attempt++)
                {
                    try
                    {
                        using var request = new HttpRequestMessage(HttpMethod.Post, "chat/completions")
                        {
                            Content = new StringContent(jsonPayload, Encoding.UTF8, "application/json")
                        };

                        if (!string.IsNullOrWhiteSpace(_aiSettings.AccessKey))
                        {
                            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _aiSettings.AccessKey);
                        }

                        if (_aiSettings.Provider.Equals("OpenRouter", StringComparison.OrdinalIgnoreCase))
                        {
                            request.Headers.TryAddWithoutValidation("HTTP-Referer", "https://edusphare.academy");
                            request.Headers.TryAddWithoutValidation("X-Title", "EduSphare");
                        }

                        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                        timeoutCts.CancelAfter(TimeSpan.FromSeconds(8));

                        var response = await _httpClient.SendAsync(request, timeoutCts.Token);
                        responseBody = await response.Content.ReadAsStringAsync(timeoutCts.Token);

                        if (responseBody.Contains("insufficient_quota", StringComparison.OrdinalIgnoreCase) ||
                            responseBody.Contains("user_not_found", StringComparison.OrdinalIgnoreCase))
                        {
                            _logger.LogWarning("انتهى رصيد الذكاء الاصطناعي، الانتقال للمولد الاحتياطي السياقي: {Response}", responseBody);
                            return GenerateFallbackAttentionQuestion(studentName, stageName, yearName, schoolName, courseName, currentDay, currentDate);
                        }

                        if (response.StatusCode == HttpStatusCode.TooManyRequests)
                        {
                            _logger.LogWarning("AI Service rate limit (429). Attempt {Attempt}. Response: {Response}", attempt, responseBody);
                            if (attempt < 2)
                            {
                                await Task.Delay(TimeSpan.FromSeconds(1), cancellationToken);
                                continue;
                            }
                            return GenerateFallbackAttentionQuestion(studentName, stageName, yearName, schoolName, courseName, currentDay, currentDate);
                        }

                        if (!response.IsSuccessStatusCode)
                        {
                            _logger.LogWarning("AI Service returned {StatusCode}. Response: {Response}. الانتقال للمولد الاحتياطي.", (int)response.StatusCode, responseBody);
                            return GenerateFallbackAttentionQuestion(studentName, stageName, yearName, schoolName, courseName, currentDay, currentDate);
                        }

                        break;
                    }
                    catch (OperationCanceledException)
                    {
                        _logger.LogWarning("انتهت مهلة طلب AI، الانتقال للمولد الاحتياطي.");
                        return GenerateFallbackAttentionQuestion(studentName, stageName, yearName, schoolName, courseName, currentDay, currentDate);
                    }
                    catch (HttpRequestException ex)
                    {
                        _logger.LogWarning(ex, "خطأ بالاتصال بخدمة AI. الانتقال للمولد الاحتياطي.");
                        if (attempt >= 2)
                        {
                            return GenerateFallbackAttentionQuestion(studentName, stageName, yearName, schoolName, courseName, currentDay, currentDate);
                        }
                    }
                }

                if (string.IsNullOrWhiteSpace(responseBody))
                {
                    return GenerateFallbackAttentionQuestion(studentName, stageName, yearName, schoolName, courseName, currentDay, currentDate);
                }

                using var doc = JsonDocument.Parse(responseBody);
                var contentString = doc.RootElement
                    .GetProperty("choices")[0]
                    .GetProperty("message")
                    .GetProperty("content")
                    .GetString();

                if (string.IsNullOrWhiteSpace(contentString))
                {
                    return GenerateFallbackAttentionQuestion(studentName, stageName, yearName, schoolName, courseName, currentDay, currentDate);
                }

                // استخراج وتطهير الـ JSON الحقيقي
                string jsonCandidate = ExtractValidJson(contentString);

                var jsonOptions = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                };

                var dtoResult = JsonSerializer.Deserialize<AttentionQuestionResponseDto>(jsonCandidate, jsonOptions);

                if (dtoResult != null && !string.IsNullOrWhiteSpace(dtoResult.Question))
                {
                    // تسوية وتأكيد نوع السؤال والإجابة
                    if (dtoResult.Type.Equals("TrueFalse", StringComparison.OrdinalIgnoreCase))
                    {
                        dtoResult.Type = "TrueFalse";
                        dtoResult.Options = null;
                        if (dtoResult.CorrectAnswer is JsonElement elem)
                        {
                            if (elem.ValueKind == JsonValueKind.True || elem.ValueKind == JsonValueKind.False)
                                dtoResult.CorrectAnswer = elem.GetBoolean();
                            else if (bool.TryParse(elem.ToString(), out bool bVal))
                                dtoResult.CorrectAnswer = bVal;
                            else
                                dtoResult.CorrectAnswer = true;
                        }
                        else if (dtoResult.CorrectAnswer is string sVal && bool.TryParse(sVal, out bool parsedB))
                        {
                            dtoResult.CorrectAnswer = parsedB;
                        }
                    }
                    else
                    {
                        dtoResult.Type = "MCQ";
                        if (dtoResult.Options == null || dtoResult.Options.Count < 2)
                        {
                            return GenerateFallbackAttentionQuestion(studentName, stageName, yearName, schoolName, courseName, currentDay, currentDate);
                        }

                        if (dtoResult.CorrectAnswer is JsonElement elem)
                        {
                            if (elem.ValueKind == JsonValueKind.Number && elem.TryGetInt32(out int nVal))
                                dtoResult.CorrectAnswer = Math.Clamp(nVal, 0, dtoResult.Options.Count - 1);
                            else if (int.TryParse(elem.ToString(), out int pVal))
                                dtoResult.CorrectAnswer = Math.Clamp(pVal, 0, dtoResult.Options.Count - 1);
                            else
                                dtoResult.CorrectAnswer = 0;
                        }
                    }

                    return dtoResult;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "حدث استثناء أثناء معالجة رد الذكاء الاصطناعي. استخدام المولد الاحتياطي.");
            }

            return GenerateFallbackAttentionQuestion(studentName, stageName, yearName, schoolName, courseName, currentDay, currentDate);
        }

        /// <summary>
        /// مولد أسئلة انتباه فوري وسياقي فائق الموثوقية (Fallback Generator) يعمل 100% بدون أي اعتماد خارجي.
        /// </summary>
        private static AttentionQuestionResponseDto GenerateFallbackAttentionQuestion(
            string studentName, string stageName, string yearName, string schoolName, string courseName, string currentDay, string currentDate)
        {
            var daysOfWeek = new List<string> { "السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة" };
            var wrongDays = daysOfWeek.Where(d => !d.Equals(currentDay, StringComparison.OrdinalIgnoreCase)).ToList();
            string wrongDay1 = wrongDays.Count > 0 ? wrongDays[Random.Shared.Next(wrongDays.Count)] : "الأحد";
            string wrongDay2 = wrongDays.Count > 1 ? wrongDays[(wrongDays.IndexOf(wrongDay1) + 1) % wrongDays.Count] : "الاثنين";
            string wrongDay3 = wrongDays.Count > 2 ? wrongDays[(wrongDays.IndexOf(wrongDay1) + 2) % wrongDays.Count] : "الثلاثاء";

            int templateIndex = Random.Shared.Next(0, 7);

            switch (templateIndex)
            {
                case 0:
                    // صح / خطأ: اليوم الحالي
                    return new AttentionQuestionResponseDto
                    {
                        Type = "TrueFalse",
                        Question = $"هل اليوم هو يوم {currentDay}؟",
                        Options = null,
                        CorrectAnswer = true
                    };

                case 1:
                    // صح / خطأ: يوم خاطئ
                    return new AttentionQuestionResponseDto
                    {
                        Type = "TrueFalse",
                        Question = $"هل اليوم هو يوم {wrongDay1}؟",
                        Options = null,
                        CorrectAnswer = false
                    };

                case 2:
                    // صح / خطأ: اسم الطالب إن وُجد
                    if (!string.IsNullOrWhiteSpace(studentName) && studentName != "الطالب العزيز")
                    {
                        return new AttentionQuestionResponseDto
                        {
                            Type = "TrueFalse",
                            Question = $"هل اسمك المسجل في الأكاديمية هو: ({studentName})؟",
                            Options = null,
                            CorrectAnswer = true
                        };
                    }
                    else
                    {
                        return new AttentionQuestionResponseDto
                        {
                            Type = "TrueFalse",
                            Question = $"هل تشاهد هذا الدرس في منصة EduSphare؟",
                            Options = null,
                            CorrectAnswer = true
                        };
                    }

                case 3:
                    // MCQ: ما هو اليوم الحالي
                    var mcqDays = new List<string> { currentDay, wrongDay1, wrongDay2, wrongDay3 };
                    // خلط الخيارات
                    var shuffledDays = mcqDays.OrderBy(_ => Random.Shared.Next()).ToList();
                    int correctDayIndex = shuffledDays.IndexOf(currentDay);
                    return new AttentionQuestionResponseDto
                    {
                        Type = "MCQ",
                        Question = "ما هو اليوم الحالي في الأسبوع؟",
                        Options = shuffledDays,
                        CorrectAnswer = correctDayIndex
                    };

                case 4:
                    // صح / خطأ: الكورس الحالي
                    if (!string.IsNullOrWhiteSpace(courseName) && courseName != "عام")
                    {
                        return new AttentionQuestionResponseDto
                        {
                            Type = "TrueFalse",
                            Question = $"هل هذا الدرس جزء من كورس ({courseName})؟",
                            Options = null,
                            CorrectAnswer = true
                        };
                    }
                    else
                    {
                        return new AttentionQuestionResponseDto
                        {
                            Type = "TrueFalse",
                            Question = "هل أنت في كامل تركيزك لمتابعة باقي محتوى الدرس؟",
                            Options = null,
                            CorrectAnswer = true
                        };
                    }

                case 5:
                    // صح / خطأ: المرحلة الدراسية
                    if (!string.IsNullOrWhiteSpace(stageName) && stageName != "غير محدد")
                    {
                        return new AttentionQuestionResponseDto
                        {
                            Type = "TrueFalse",
                            Question = $"هل مرحلتك الدراسية الحالية هي: ({stageName})؟",
                            Options = null,
                            CorrectAnswer = true
                        };
                    }
                    else
                    {
                        return new AttentionQuestionResponseDto
                        {
                            Type = "TrueFalse",
                            Question = "هل قمت بتدوين الملاحظات الهامة أثناء مشاهدة هذا الدرس؟",
                            Options = null,
                            CorrectAnswer = true
                        };
                    }

                default:
                    // MCQ: سؤال تركيز سريع
                    return new AttentionQuestionResponseDto
                    {
                        Type = "MCQ",
                        Question = "ما هو التقييم الحالي لمدى تركيزك في شرح المعلم؟",
                        Options = new List<string> { "مركز بنسبة 100%", "جيد جداً ومتابع", "أحتاج لمراجعة بسيطة", "مشوش قليلاً" },
                        CorrectAnswer = 0
                    };
            }
        }

        private const string VideoQuizPromptTemplate = @"أنت نظام متخصص لتوليد اختبار نهاية درس من نص تفريغ فيديو تعليمي.

نص تفريغ الفيديو:
{{TranscriptionText}}

مهمتك:
قم بتوليد 10 أسئلة فقط مبنية حصراً على محتوى النص أعلاه، بمزيج من نوعي MCQ و TrueFalse.

أنواع الأسئلة المسموح بها فقط:

1. MCQ (اختيار من متعدد):
- type: ""MCQ""
- question: سؤال واضح متعلق بالمحتوى
- options: مصفوفة من 4 اختيارات متميزة
- correctAnswer: رقم دليلي للاختيار الصحيح يبدأ من 0

2. TrueFalse (صح أم خطأ):
- type: ""TrueFalse""
- question: عبارة أو سؤال يمكن الحكم عليه بصح/خطأ بناءً على المحتوى
- options: null
- correctAnswer: true أو false

قواعد صارمة:
- يجب أن تكون الأسئلة مبنية على النص فقط، بلا معلومات خارجية.
- نوّع بين MCQ و TrueFalse (حوالي نصف ونصف).
- لا تكرر الأسئلة.
- أرجع مصفوفة JSON صالحة فقط دون أي نص أو شرح خارجي.

الصيغة المطلوبة حصرياً:
[
  {
    ""type"": ""MCQ"",
    ""question"": ""..."",
    ""options"": [""..."", ""..."", ""..."", ""...""],
    ""correctAnswer"": 0
  },
  {
    ""type"": ""TrueFalse"",
    ""question"": ""..."",
    ""options"": null,
    ""correctAnswer"": true
  }
]

أرجع مصفوفة JSON تحتوي على 10 عناصر فقط.";

        public async Task<List<VideoQuizQuestionDto>?> GenerateVideoQuizAsync(string transcriptionText, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(transcriptionText))
            {
                _logger.LogWarning("تعذر توليد اختبار الفيديو: نص التفريغ فارغ.");
                return null;
            }

            // حد أقصى معقول لتجنب تجاوز نافذة السياق
            string trimmedText = transcriptionText.Length > 12000
                ? transcriptionText[..12000]
                : transcriptionText;

            string finalPrompt = VideoQuizPromptTemplate.Replace("{{TranscriptionText}}", trimmedText);

            string modelToUse = _aiSettings.ModelName;
            if (string.IsNullOrWhiteSpace(modelToUse))
            {
                modelToUse = "openrouter/free";
            }

            var requestBody = new
            {
                model = modelToUse,
                temperature = _aiSettings.Temperature > 0 ? _aiSettings.Temperature : 0.7,
                messages = new[]
                {
                    new { role = "user", content = finalPrompt }
                }
            };

            string jsonPayload = JsonSerializer.Serialize(requestBody);
            string responseBody = string.Empty;

            for (int attempt = 1; attempt <= 3; attempt++)
            {
                try
                {
                    using var request = new HttpRequestMessage(HttpMethod.Post, "chat/completions")
                    {
                        Content = new StringContent(jsonPayload, Encoding.UTF8, "application/json")
                    };

                    if (!string.IsNullOrWhiteSpace(_aiSettings.AccessKey))
                    {
                        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _aiSettings.AccessKey);
                    }

                    if (_aiSettings.Provider.Equals("OpenRouter", StringComparison.OrdinalIgnoreCase))
                    {
                        request.Headers.TryAddWithoutValidation("HTTP-Referer", "https://edusphare.academy");
                        request.Headers.TryAddWithoutValidation("X-Title", "EduSphare");
                    }

                    var response = await _httpClient.SendAsync(request, cancellationToken);
                    responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

                    if (responseBody.Contains("insufficient_quota", StringComparison.OrdinalIgnoreCase) ||
                        responseBody.Contains("user_not_found", StringComparison.OrdinalIgnoreCase))
                    {
                        _logger.LogError("انتهى رصيد الذكاء الاصطناعي أو تفعيل API غير متاح: {Response}", responseBody);
                        throw new AiQuotaExceededException("انتهت كوتا الذكاء الاصطناعي (Quota Exceeded)، يرجى الاتصال بالدعم الفني لتفعيلها.");
                    }

                    if (response.StatusCode == HttpStatusCode.TooManyRequests)
                    {
                        _logger.LogWarning("AI Service rate limit (429) during video quiz. Attempt {Attempt}. Response: {Response}", attempt, responseBody);

                        if (attempt < 3)
                        {
                            await Task.Delay(TimeSpan.FromSeconds(attempt * 3), cancellationToken);
                            continue;
                        }
                    }

                    if (!response.IsSuccessStatusCode)
                    {
                        _logger.LogError("AI Service Error during video quiz. Status: {StatusCode}. Response: {Response}", (int)response.StatusCode, responseBody);
                        throw new HttpRequestException($"AI API returned {(int)response.StatusCode}: {responseBody}");
                    }

                    break;
                }
                catch (AiQuotaExceededException)
                {
                    throw;
                }
                catch (HttpRequestException)
                {
                    if (attempt >= 3) throw;
                }
            }

            if (string.IsNullOrWhiteSpace(responseBody))
            {
                _logger.LogWarning("رد فارغ من AI أثناء توليد اختبار الفيديو");
                return null;
            }

            using var doc = JsonDocument.Parse(responseBody);
            var contentString = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            if (string.IsNullOrWhiteSpace(contentString))
            {
                return null;
            }

            string jsonCandidate = ExtractValidJsonArray(contentString);

            var jsonOptions = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };

            var questions = JsonSerializer.Deserialize<List<VideoQuizQuestionDto>>(jsonCandidate, jsonOptions);
            if (questions == null || questions.Count == 0)
            {
                _logger.LogWarning("فشل تحويل أسئلة اختبار الفيديو من JSON");
                return null;
            }

            foreach (var q in questions)
            {
                if (q.Type.Equals("TrueFalse", StringComparison.OrdinalIgnoreCase))
                {
                    q.Options = null;
                }
            }

            // اقتصر على 10 أسئلة كحد أقصى
            if (questions.Count > 10)
            {
                questions = questions.Take(10).ToList();
            }

            return questions;
        }

        private static string ExtractValidJson(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return "{}";

            // إزالة وسوم التفكير <think>...</think> التي قد ترجعها بعض النماذج
            string cleaned = Regex.Replace(text, @"<think>[\s\S]*?</think>", "", RegexOptions.IgnoreCase).Trim();

            // إزالة علامات markdown كود
            cleaned = Regex.Replace(cleaned, @"```json\s*", "", RegexOptions.IgnoreCase);
            cleaned = cleaned.Replace("```", "").Trim();

            int startIndex = cleaned.IndexOf('{');
            int endIndex = cleaned.LastIndexOf('}');

            if (startIndex >= 0 && endIndex > startIndex)
            {
                return cleaned.Substring(startIndex, endIndex - startIndex + 1);
            }

            return cleaned;
        }

        private static string ExtractValidJsonArray(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return "[]";

            string cleaned = Regex.Replace(text, @"<think>[\s\S]*?</think>", "", RegexOptions.IgnoreCase).Trim();
            cleaned = Regex.Replace(cleaned, @"```json\s*", "", RegexOptions.IgnoreCase);
            cleaned = cleaned.Replace("```", "").Trim();

            int startIndex = cleaned.IndexOf('[');
            int endIndex = cleaned.LastIndexOf(']');

            if (startIndex >= 0 && endIndex > startIndex)
            {
                return cleaned.Substring(startIndex, endIndex - startIndex + 1);
            }

            // fallback: single object → wrap as array
            string objectJson = ExtractValidJson(cleaned);
            if (objectJson.StartsWith('{'))
            {
                return "[" + objectJson + "]";
            }

            return cleaned;
        }
    }
}
