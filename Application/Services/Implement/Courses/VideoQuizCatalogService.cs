using System.Text.Json;
using EduSphare.Application.DTOs.Ai;
using EduSphare.Application.Services.Interface.Ai;
using EduSphare.Domain.Entities;
using EduSphare.Infrastructure.UnitOfWork;

namespace EduSphare.Application.Services.Implement.Courses
{
    public class VideoQuizCatalogService(IUnitOfWork uow) : IVideoQuizCatalogService
    {
        private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

        public async Task<VideoQuizCatalogResponseDto> GetQuestionsByVideoAsync(string studentId, string videoId)
        {
            var video = await uow.Videos.GetByIdAsync(videoId);
            if (video == null) return Empty();
            return BuildResponse([video]);
        }

        public async Task<VideoQuizCatalogResponseDto> GetQuestionsByCourseAsync(string studentId, string courseId)
        {
            var courseVideos = await uow.Videos.GetManyByQueryAsync(v => v.CourseId == courseId);
            var videoIds = courseVideos.Select(v => v.Id).ToHashSet();

            var watched = await uow.WatchedVideos.GetManyByQueryAsync(
                w => w.StudentId == studentId && w.WatchedBoolean && videoIds.Contains(w.VideoId));

            var watchedIds = watched.Select(w => w.VideoId).ToHashSet();

            var videos = courseVideos.OrderBy(v => v.SortOrder).ToList();

            return BuildResponse(videos);
        }

        private VideoQuizCatalogResponseDto BuildResponse(IEnumerable<Video> videos)
        {
            var catalog = videos.Select(v =>
            {
                var questions = ParseQuestions(v.GeneratedQuestionsJson);
                return new VideoQuizCatalogDto
                {
                    VideoId      = v.Id,
                    VideoTitle   = v.Title,
                    SortOrder    = v.SortOrder,
                    HasQuestions = questions.Count > 0,
                    Questions    = questions
                };
            }).ToList();

            return new VideoQuizCatalogResponseDto
            {
                TotalVideos         = catalog.Count,
                VideosWithQuestions = catalog.Count(v => v.HasQuestions),
                TotalQuestions      = catalog.Sum(v => v.Questions.Count),
                Videos              = catalog
            };
        }

        private static List<QuizCatalogQuestionDto> ParseQuestions(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return [];
            try
            {
                var raw = JsonSerializer.Deserialize<List<VideoQuizQuestionDto>>(json, JsonOpts);
                if (raw == null) return [];
                return raw.Select((q, i) => new QuizCatalogQuestionDto
                {
                    Index         = i,
                    Type          = q.Type,
                    Question      = q.Question,
                    Options       = q.Options,
                    CorrectAnswer = q.CorrectAnswer
                }).ToList();
            }
            catch { return []; }
        }

        private static VideoQuizCatalogResponseDto Empty() => new()
        {
            TotalVideos = 0, VideosWithQuestions = 0, TotalQuestions = 0, Videos = []
        };
    }
}
