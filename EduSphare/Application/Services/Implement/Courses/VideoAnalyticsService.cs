using EduSphare.Application.DTOs.Courses;
using EduSphare.Application.Services.Interface.Courses;
using EduSphare.Domain.Entities;
using EduSphare.Infrastructure.UnitOfWork;

namespace EduSphare.Application.Services.Implement.Courses;

/// <summary>Reads teacher-facing lesson analytics from persisted enrollment and watch records.</summary>
public class VideoAnalyticsService(IUnitOfWork uow) : IVideoAnalyticsService
{
    public async Task<IReadOnlyCollection<VideoTeacherStatisticsDto>> GetCourseVideoStatisticsAsync(string courseId)
    {
        var now = DateTime.UtcNow;
        var studentIds = (await uow.Enrollments.GetManyByQueryAsync(e => e.CourseId == courseId))
            .Select(e => e.StudentId).Distinct().ToList();
        var videos = await uow.Videos.GetManyByQueryAsync(v => v.CourseId == courseId);

        // Once the deadline has passed, make attendance persistent for every enrolled student.
        foreach (var video in videos.Where(v => now >= v.CreatedAt.AddDays(v.AvailabilityDays)))
        foreach (var studentId in studentIds)
        {
            var record = await uow.WatchedVideos.GetByQuery(w => w.StudentId == studentId && w.VideoId == video.Id);
            if (record is null)
                uow.WatchedVideos.Add(new WatchedVideo(studentId, video.Id, false, -1, 0, now) { IsAbsent = true, AbsentMarkedAt = now });
            else if (!record.WatchedBoolean || record.WatchedAt > video.CreatedAt.AddDays(video.AvailabilityDays))
            {
                record.IsAbsent = true;
                record.AbsentMarkedAt ??= now;
                uow.WatchedVideos.Update(record);
            }
        }
        await uow.SaveChangesAsync();

        var videoIds = videos.Select(v => v.Id).ToHashSet();
        var watched = await uow.WatchedVideos.GetManyByQueryAsync(w => videoIds.Contains(w.VideoId));
        return videos.Select(video =>
        {
            var records = watched.Where(w => w.VideoId == video.Id).ToList();
            var scores = records.Where(w => w.Degree >= 0 && !(w.Degree == 100m && w.FocusPercent == 100m)).Select(w => w.Degree).ToList();
            var focus = records.Where(w => w.WatchedBoolean)
                               .Select(w => Math.Min(100m, w.FocusPercent))
                               .ToList();
            return new VideoTeacherStatisticsDto
            {
                VideoId = video.Id,
                EnrolledStudentsCount = studentIds.Count,
                WatchedStudentsCount = records.Count(w => w.WatchedBoolean),
                AbsentStudentsCount = records.Count(w => w.IsAbsent),
                AveragePostVideoQuizScore = scores.Count == 0 ? null : Math.Round(scores.Average(), 2),
                AverageFocusPercent = focus.Count == 0 ? null : Math.Round(focus.Average(), 2)
            };
        }).ToList();
    }
}
