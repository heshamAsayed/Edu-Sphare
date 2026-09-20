using EduSphare.Application.DTOs.Courses;
using EduSphare.Application.Services.Interface.Ai;
using EduSphare.Application.Services.Interface.Auth;
using EduSphare.Application.Services.Interface.Courses;
using EduSphare.Domain.Entities;
using EduSphare.Domain.Entities.Users;
using EduSphare.Infrastructure.UnitOfWork;
using EduSphare.Infrastructure.Settings;
using AutoMapper;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Options;

namespace EduSphare.Application.Services.Implement.Courses;

public class VideosService(
    IUnitOfWork uow,
    IMapper mapper,
    IUploadVideo uploadService,
    ICourses courseService,
    ICurrentUserService currentUserService,
    IVideoTranscriptionQueue transcriptionQueue,
    IWebHostEnvironment hostEnvironment,
    IOptions<AttachmentStorageSettings> attachmentSettings) : IVideos
{
    public async Task<VideoDTo> GetVideoById(string videoId)
    {
        var video = await uow.Videos.GetByQueryIncludingAsync(v => v.Id == videoId, "Attachments");
        if (video is null) throw new KeyNotFoundException("Video was not found.");

        var dto = mapper.Map<VideoDTo>(video);
        var publicBaseUrl = attachmentSettings.Value.PublicBaseUrl.TrimEnd('/');
        dto.Attachments = (video.Attachments ?? [])
            .Select(a => new VideoAttachmentDto
            {
                Id = a.Id,
                OriginalFileName = a.OriginalFileName,
                Url = $"{publicBaseUrl}/{a.VideoId}/{a.StoredFileName}"
            })
            .ToList();
        return dto;
    }

    public async Task<ICollection<VideoDTo>> GetVideosByCourseId(string courseId)
    {
        var videos = await uow.Videos.GetManyByQueryIncludingAsync(v => v.CourseId == courseId, "Attachments");
        var result = mapper.Map<List<VideoDTo>>(videos.OrderBy(v => v.SortOrder));
        var publicBaseUrl = attachmentSettings.Value.PublicBaseUrl.TrimEnd('/');
        foreach (var dto in result)
            dto.Attachments = (videos.First(v => v.Id == dto.Id).Attachments ?? [])
                .Select(a => new VideoAttachmentDto { Id = a.Id, OriginalFileName = a.OriginalFileName, Url = $"{publicBaseUrl}/{a.VideoId}/{a.StoredFileName}" }).ToList();
        return result;
    }

    public async Task<ICollection<VideoDTo>> GetVideoWatched(string studentId, string videoId)
    {
        var watchedVideos = await uow.WatchedVideos.GetManyByQueryIncludingAsync(
            w => w.StudentId == studentId && w.VideoId == videoId,
            "Video");

        return watchedVideos
            .Where(w => w.Video is not null)
            .Select(w =>
            {
                var dto = mapper.Map<VideoDTo>(w.Video!);
                dto.IsWatched = w.WatchedBoolean;
                return dto;
            })
            .ToList();
    }

    private async Task EnsureStudentProfileExistsAsync(string studentId)
    {
        if (await uow.Students.IsExist(studentId)) return;

        var user = await uow.Users.GetByIdAsync(studentId);
        if (user == null)
            throw new KeyNotFoundException("Student was not found.");

        var defaultSchool = (await uow.Schools.GetAllAsync()).FirstOrDefault();
        if (defaultSchool == null)
        {
            defaultSchool = new Domain.Entities.Main.School("المدرسة العامة");
            uow.Schools.Add(defaultSchool);
            await uow.SaveChangesAsync();
        }

        var defaultStage = (await uow.Stages.GetAllAsync()).FirstOrDefault();
        if (defaultStage == null)
        {
            defaultStage = new Domain.Entities.Main.Stage("المرحلة العامة", 1, defaultSchool.Id);
            uow.Stages.Add(defaultStage);
            await uow.SaveChangesAsync();
        }

        var defaultYear = (await uow.Years.GetAllAsync()).FirstOrDefault();
        if (defaultYear == null)
        {
            defaultYear = new Domain.Entities.Main.Year("السنة العامة", 1, defaultStage.Id);
            uow.Years.Add(defaultYear);
            await uow.SaveChangesAsync();
        }

        var student = new Student(
            DateTime.UtcNow,
            defaultYear.Id,
            defaultStage.Id,
            defaultSchool.Id,
            studentId);

        uow.Students.Add(student);
        await uow.SaveChangesAsync();
    }

    public async Task<VideoWatchResponseDto> AddVideoAsWatched(string studentId, string videoId)
    {
        await EnsureStudentProfileExistsAsync(studentId);
        if (!await uow.Videos.IsExist(videoId))
            throw new KeyNotFoundException("Video was not found.");

        var watchedVideo = await uow.Videos.GetByIdAsync(videoId);
        if (watchedVideo is null)
            throw new KeyNotFoundException("Video was not found.");
        var now = DateTime.UtcNow;
        var attendanceDeadline = watchedVideo.CreatedAt.AddDays(watchedVideo.AvailabilityDays);
        var isLate = now > attendanceDeadline;

        var watched = await uow.WatchedVideos.GetByQuery(w => w.StudentId == studentId && w.VideoId == videoId);
        if (watched is null)
        {
            // Degree = -1 means end-of-video quiz not yet taken
            watched = new WatchedVideo(studentId, videoId, true, -1, 100, now)
            {
                IsAbsent = isLate,
                AbsentMarkedAt = isLate ? now : null,
            };
            uow.WatchedVideos.Add(watched);
        }
        else
        {
            watched.WatchedBoolean = true;
            watched.WatchedAt = now;
            if (!watched.IsAbsent && isLate)
            {
                watched.IsAbsent = true;
                watched.AbsentMarkedAt = now;
            }
            uow.WatchedVideos.Update(watched);
        }

        await uow.SaveChangesAsync();
        return new VideoWatchResponseDto
        {
            StudentId = studentId,
            VideoId = videoId,
            IsWatched = watched.WatchedBoolean,
            WatchedAt = watched.WatchedAt,
            IsAbsent = watched.IsAbsent,
        };
    }

    /// <summary>
    /// تسجيل ومراكمة نسبة عدم التركيز (FocusPercent) الخاصة بالطالب عند التأخير في إجابة أسئلة الانتباه بمعدل 10% لكل دقيقة تأخير.
    /// </summary>
    public async Task RecordAttentionPenaltyAsync(string studentId, string videoId, int responseTimeSeconds)
    {
        if (string.IsNullOrWhiteSpace(studentId) || string.IsNullOrWhiteSpace(videoId))
            return;

        await EnsureStudentProfileExistsAsync(studentId);

        int minutesLate = responseTimeSeconds / 60;
        if (minutesLate <= 0) return; // لا يوجد خصم إذا جاوب في أقل من دقيقة

        decimal penalty = minutesLate * 10m; // 10% لكل دقيقة تأخير

        var watched = await uow.WatchedVideos.GetByQuery(w => w.StudentId == studentId && w.VideoId == videoId);
        if (watched is null)
        {
            // Degree = -1: end-of-video quiz not yet taken
            // FocusPercent is stored as remaining focus (0-100). Start at 100 then subtract penalty.
            var initialFocus = Math.Max(0m, 100m - penalty);
            watched = new WatchedVideo(studentId, videoId, false, -1, initialFocus, DateTime.UtcNow);
            uow.WatchedVideos.Add(watched);
        }
        else
        {
            // Decrease remaining focus by penalty. Clamp to [0,100].
            watched.FocusPercent = Math.Max(0m, Math.Min(100m, watched.FocusPercent - penalty));
            uow.WatchedVideos.Update(watched);
        }

        await uow.SaveChangesAsync();
    }

    /// <summary>
    /// Creates and uploads a single video to a course.
    /// Verifies that the course belongs to the current teacher.
    /// </summary>
    public async Task<VideoResponseDto> CreateAndUploadVideoAsync(CreateVideoDto dto, string? uploadId = null)
    {
        var teacherId = currentUserService.UserId ?? string.Empty;

        if (string.IsNullOrWhiteSpace(teacherId))
            throw new UnauthorizedAccessException("Teacher is not authenticated.");

        // Verify course ownership
        var isCourseOwned = await courseService.IsCourseOwnedByTeacherAsync(dto.CourseId, teacherId);
        if (!isCourseOwned)
            throw new UnauthorizedAccessException("You do not have permission to add videos to this course.");

        // Verify course exists
        var course = await uow.Courses.GetByIdAsync(dto.CourseId);
        if (course is null)
            throw new KeyNotFoundException("Course was not found.");

        // Check if a video with the same SortOrder already exists in this course
        var existingWithOrder = await uow.Videos.GetByQuery(v => v.CourseId == dto.CourseId && v.SortOrder == dto.SortOrder);
        if (existingWithOrder is not null)
            throw new InvalidOperationException($"Lesson order {dto.SortOrder} is already used in this course. Choose a different order.");

        // Create video on Bunny Stream
        string bunnyVideoId;
        try
        {
            bunnyVideoId = await uploadService.CreateVideoAsync(
                dto.Title,
                dto.Description,
                dto.Tags);
        }
        catch (Exception ex)
        {
            if (!string.IsNullOrWhiteSpace(uploadId)) UploadProgressTracker.SetFailed(uploadId, ex.Message);
            throw new InvalidOperationException("Failed to create video entry on Bunny Stream.", ex);
        }

        // Persist the lesson before starting work so its one transcription state lives
        // on the Videos row and can be shown immediately in the teacher UI.
        var video = new Video(
            sortOrder: dto.SortOrder,
            createdAt: DateTime.UtcNow,
            resource: bunnyVideoId,
            bankQuotationsId: "",
            courseId: dto.CourseId)
        {
            BunnyVideoId = bunnyVideoId,
            Title = dto.Title,
            Description = dto.Description,
            Tags = dto.Tags is not null ? string.Join(",", dto.Tags) : null,
            AvailabilityDays = dto.AvailabilityDays,
            TranscriptionStatus = "Pending"
        };
        uow.Videos.Add(video);
        await uow.SaveChangesAsync();

        string? bunnyTempFilePath = null;
        string? transcriptionTempFilePath = null;

        // Upload video file binary to Bunny Stream
        if (dto.VideoFile is not null && dto.VideoFile.Length > 0)
        {
            // Use physical copies: Bunny and Deepgram never share a stream or a temp file.
            bunnyTempFilePath = Path.Combine(Path.GetTempPath(), $"bunny_{Guid.NewGuid():N}_{Path.GetFileName(dto.VideoFile.FileName)}");
            transcriptionTempFilePath = Path.Combine(Path.GetTempPath(), $"deepgram_{Guid.NewGuid():N}_{Path.GetFileName(dto.VideoFile.FileName)}");
            try
            {
                using (var fileStream = new FileStream(bunnyTempFilePath, FileMode.CreateNew, FileAccess.Write, FileShare.None, bufferSize: 81920, useAsync: true))
                {
                    await dto.VideoFile.CopyToAsync(fileStream);
                }
                File.Copy(bunnyTempFilePath, transcriptionTempFilePath, overwrite: false);

                // The worker owns the Deepgram copy. Bunny receives a distinct file below.
                video.TranscriptionStatus = "Processing";
                uow.Videos.Update(video);
                await uow.SaveChangesAsync();
                transcriptionQueue.QueueVideoForTranscription(video.Id, transcriptionTempFilePath);

                using (var uploadStream = new FileStream(bunnyTempFilePath, FileMode.Open, FileAccess.Read, FileShare.Read, bufferSize: 81920, useAsync: true))
                {
                    await uploadService.UploadVideoFileAsync(bunnyVideoId, uploadStream, dto.VideoFile.FileName, uploadId);
                }
            }
            catch (Exception ex)
            {
                if (!string.IsNullOrWhiteSpace(uploadId)) UploadProgressTracker.SetFailed(uploadId, ex.Message);

                if (!string.IsNullOrEmpty(bunnyTempFilePath) && File.Exists(bunnyTempFilePath)) try { File.Delete(bunnyTempFilePath); } catch { }
                if (!string.IsNullOrEmpty(transcriptionTempFilePath) && File.Exists(transcriptionTempFilePath)) try { File.Delete(transcriptionTempFilePath); } catch { }

                // Cleanup video entry from Bunny if stream upload fails
                try { await uploadService.DeleteVideoAsync(bunnyVideoId); } catch { }
                uow.Videos.Delete(video);
                await uow.SaveChangesAsync();
                
                var detail = ex.InnerException?.Message ?? ex.Message;
                throw new InvalidOperationException($"فشل رفع ملف الفيديو إلى Bunny Stream: {detail}", ex);
            }
            finally
            {
                if (!string.IsNullOrEmpty(bunnyTempFilePath) && File.Exists(bunnyTempFilePath))
                    try { File.Delete(bunnyTempFilePath); } catch { }
            }
        }

        await SaveAttachmentsAsync(video, dto.Attachments, uploadId);

        return mapper.Map<VideoResponseDto>(video);
    }

    /// <summary>
    /// Creates and uploads multiple videos to a course in a batch.
    /// Verifies that the course belongs to the current teacher.
    /// </summary>
    public async Task<List<VideoResponseDto>> CreateAndUploadVideosAsync(CreateVideosBatchDto dto)
    {
        var results = new List<VideoResponseDto>();

        foreach (var videoDto in dto.Videos)
        {
            videoDto.CourseId = dto.CourseId; // Ensure consistent course ID
            try
            {
                var result = await CreateAndUploadVideoAsync(videoDto);
                results.Add(result);
            }
            catch (Exception ex)
            {
                // Log the error but continue with the next video
                // Consider: should we fail the entire batch or just skip failed videos?
                throw; // For now, fail the entire batch on first error
            }
        }

        return results;
    }

    /// <summary>
    /// Deletes a video from the course and removes it from Bunny Stream.
    /// Verifies that the course belongs to the current teacher.
    /// </summary>
    public async Task DeleteVideoAsync(string videoId)
    {
        var currentTeacherId = currentUserService.UserId
            ?? throw new UnauthorizedAccessException("User is not authenticated.");

        var video = await uow.Videos.GetByQueryIncludingAsync(
            v => v.Id == videoId,
            "Course");

        if (video is null)
            throw new KeyNotFoundException("Video was not found.");

        // Verify course ownership
        var isCourseOwned = await courseService.IsCourseOwnedByTeacherAsync(video.CourseId, currentTeacherId);
        if (!isCourseOwned)
            throw new UnauthorizedAccessException("You do not have permission to delete videos from this course.");

        // Delete from Bunny Stream if BunnyVideoId exists
        if (!string.IsNullOrWhiteSpace(video.BunnyVideoId))
        {
            try
            {
                await uploadService.DeleteVideoAsync(video.BunnyVideoId);
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException("Failed to delete video from Bunny Stream.", ex);
            }
        }

        // Delete from database
        uow.Videos.Delete(video);
        await uow.SaveChangesAsync();
    }

    public async Task ReorderVideoAsync(string videoId, int targetSortOrder)
    {
        if (targetSortOrder < 0) throw new InvalidOperationException("ترتيب الفيديو يجب أن يكون صفراً أو أكبر.");
        var teacherId = currentUserService.UserId ?? throw new UnauthorizedAccessException();
        var video = await uow.Videos.GetByIdAsync(videoId) ?? throw new KeyNotFoundException("Video was not found.");
        if (!await courseService.IsCourseOwnedByTeacherAsync(video.CourseId, teacherId)) throw new UnauthorizedAccessException();
        if (video.SortOrder == targetSortOrder) return;
        var originalSortOrder = video.SortOrder;
        var other = await uow.Videos.GetByQuery(v => v.CourseId == video.CourseId && v.SortOrder == targetSortOrder);
        await using var transaction = await uow.BeginTransactionAsync();
        video.SortOrder = -1 - Math.Abs(video.SortOrder) - targetSortOrder;
        uow.Videos.Update(video);
        await uow.SaveChangesAsync();
        // Put the displaced video in the source position; a non-existing target simply moves the video.
        if (other is not null) { other.SortOrder = originalSortOrder; uow.Videos.Update(other); }
        video.SortOrder = targetSortOrder;
        uow.Videos.Update(video);
        await uow.SaveChangesAsync();
        await transaction.CommitAsync();
    }

    private async Task SaveAttachmentsAsync(Video video, IEnumerable<IFormFile> files, string? uploadId)
    {
        var validFiles = files?.Where(f => f.Length > 0).ToList() ?? [];
        if (validFiles.Count == 0) return;
        var progressId = string.IsNullOrWhiteSpace(uploadId) ? null : $"attachments_{uploadId}";
        var totalBytes = validFiles.Sum(f => f.Length);
        var copiedBytes = 0L;
        if (progressId != null) UploadProgressTracker.UpdateProgress(progressId, 0, totalBytes, "SavingAttachments");
        var root = hostEnvironment.WebRootPath ?? Path.Combine(hostEnvironment.ContentRootPath, "wwwroot");
        var folder = Path.Combine(root, attachmentSettings.Value.RelativePath.Replace('/', Path.DirectorySeparatorChar), video.Id);
        Directory.CreateDirectory(folder);
        foreach (var file in validFiles)
        {
            var extension = Path.GetExtension(Path.GetFileName(file.FileName));
            var stored = $"{Guid.NewGuid():N}{extension}";
            await using var source = file.OpenReadStream();
            await using var stream = new FileStream(Path.Combine(folder, stored), FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, useAsync: true);
            var buffer = new byte[81920];
            int read;
            while ((read = await source.ReadAsync(buffer)) > 0)
            {
                await stream.WriteAsync(buffer.AsMemory(0, read));
                copiedBytes += read;
                if (progressId != null) UploadProgressTracker.UpdateProgress(progressId, copiedBytes, totalBytes, "SavingAttachments");
            }
            uow.VideoAttachments.Add(new VideoAttachment { VideoId = video.Id, OriginalFileName = Path.GetFileName(file.FileName), StoredFileName = stored, ContentType = file.ContentType ?? string.Empty, Length = file.Length });
        }
        await uow.SaveChangesAsync();
        if (progressId != null) UploadProgressTracker.SetCompleted(progressId);
    }

    public async Task<VideoTranscriptionStatusDto> GetTranscriptionStatusAsync(string videoId)
    {
        var teacherId = currentUserService.UserId ?? throw new UnauthorizedAccessException();
        var video = await uow.Videos.GetByIdAsync(videoId) ?? throw new KeyNotFoundException("Video was not found.");
        if (!await courseService.IsCourseOwnedByTeacherAsync(video.CourseId, teacherId))
            throw new UnauthorizedAccessException();

        return new VideoTranscriptionStatusDto
        {
            VideoId = videoId,
            Status = video.TranscriptionStatus,
            ErrorMessage = video.TranscriptionError
        };
    }
}
