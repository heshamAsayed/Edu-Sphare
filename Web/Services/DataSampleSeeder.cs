using EduSphare.Application.DTOs.Auth.Teacher;
using EduSphare.Application.DTOs.SiteStructure;
using EduSphare.Application.Services.Interface.Auth;
using EduSphare.Application.Services.Interface.SiteStructure;
using EduSphare.Domain.Entities;
using EduSphare.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EduSphare.Web.Services;

/// <summary>Adds only the new, video-free sample catalog to an existing development database.</summary>
public sealed class DataSampleSeeder(
    ApplicationDbContext context,
    IStructureService structureService,
    ITeacher teacherService,
    IWebHostEnvironment environment)
{
    private const string Password = "EduSphare123!";

    public async Task<SampleSeedResult> SeedAsync(CancellationToken cancellationToken = default)
    {
        // Legacy seed inserts are intentionally disabled:
        // - EduSphare Cairo School and EduSphare Giza School already have their courses and videos.
        // - Existing students, enrollments, payments, videos, transcriptions, and quizzes must not be added again.
        // This seed only appends the two new schools below, with courses that have no videos or payments.
        var schoolNames = new[] { "EduSphare Alexandria School", "EduSphare Mansoura School" };
        var stageNames = new[] { "Primary", "Preparatory", "Secondary" };

        if (await context.Schools.AnyAsync(school => schoolNames.Contains(school.Name), cancellationToken))
            throw new InvalidOperationException("The new sample schools have already been added. No duplicate data was created.");

        var webRoot = environment.WebRootPath ?? Path.Combine(environment.ContentRootPath, "wwwroot");
        var schoolImages = GetFiles(Path.Combine(webRoot, "images", "schools"), "*.*").Select(path => ToWebPath(webRoot, path)).ToList();
        var courseImages = GetFiles(Path.Combine(webRoot, "images", "courses"), "*.*").Select(path => ToWebPath(webRoot, path)).ToList();
        if (schoolImages.Count == 0 || courseImages.Count == 0)
            throw new InvalidOperationException("School and course images are required in wwwroot/images.");

        var random = new Random();
        using var schoolImageCycle = ShuffleAndCycle(schoolImages, random).GetEnumerator();
        using var courseImageCycle = ShuffleAndCycle(courseImages, random).GetEnumerator();
        var teachersCount = 0;
        var coursesCount = 0;

        for (var schoolNo = 1; schoolNo <= schoolNames.Length; schoolNo++)
        {
            var school = await structureService.AddSchool(new SchoolDto
            {
                Name = schoolNames[schoolNo - 1],
                ImagePath = Next(schoolImageCycle)
            }) ?? throw new InvalidOperationException("Could not create a new sample school.");

            for (var stageNo = 1; stageNo <= stageNames.Length; stageNo++)
            {
                var stage = await structureService.AddStage(new StageDto
                {
                    Name = stageNames[stageNo - 1],
                    OrderNo = stageNo,
                    SchoolId = school.Id
                }) ?? throw new InvalidOperationException("Could not create a new sample stage.");

                for (var yearNo = 1; yearNo <= 3; yearNo++)
                {
                    var year = await structureService.AddYear(new YearDto
                    {
                        Name = $"Year {yearNo}",
                        OrderNo = yearNo,
                        StageId = stage.Id
                    }) ?? throw new InvalidOperationException("Could not create a new sample year.");

                    for (var courseNo = 1; courseNo <= 3; courseNo++)
                    {
                        var teacherNumber = ++teachersCount;
                        var teacher = await teacherService.AddTeacher(new TeacherDto
                        {
                            Name = $"New Sample Teacher {teacherNumber}",
                            Email = $"seed.new.teacher{teacherNumber}@edusphare.test",
                            UserName = $"seed.new.teacher{teacherNumber}@edusphare.test",
                            PhoneNumber = $"012{teacherNumber:0000000}",
                            Password = Password,
                            SchoolId = school.Id,
                            StageIds = [stage.Id],
                            YearIds = [year.Id]
                        }) ?? throw new InvalidOperationException($"Could not create new sample teacher {teacherNumber}.");

                        var teacherEntity = await context.Teachers.SingleAsync(item => item.ApplicationUserId == teacher.Id, cancellationToken);
                        var course = new Course(
                            $"{school.Name} — {stage.Name} Year {yearNo} Course {courseNo}",
                            DateTime.UtcNow.AddMinutes(-teacherNumber),
                            year.Id,
                            stage.Id,
                            150m + courseNo * 50m)
                        {
                            Description = $"Video-free sample course {courseNo} for {school.Name}, {stage.Name} Year {yearNo}.",
                            SortOrder = courseNo,
                            ImagePath = Next(courseImageCycle)
                        };

                        course.teachers.Add(teacherEntity);
                        context.Courses.Add(course);
                        coursesCount++;
                    }
                }
            }
        }

        await context.SaveChangesAsync(cancellationToken);
        return new SampleSeedResult(schoolNames.Length, schoolNames.Length * stageNames.Length, schoolNames.Length * stageNames.Length * 3, teachersCount, 0, coursesCount, 0, 0, 0, 0);
    }

    private static List<string> GetFiles(string folder, string pattern) => Directory.Exists(folder)
        ? Directory.GetFiles(folder, pattern, SearchOption.TopDirectoryOnly).OrderBy(path => path, StringComparer.OrdinalIgnoreCase).ToList()
        : [];

    private static string ToWebPath(string webRoot, string absolutePath) => "/" + Path.GetRelativePath(webRoot, absolutePath).Replace(Path.DirectorySeparatorChar, '/');

    private static IEnumerable<T> ShuffleAndCycle<T>(IReadOnlyList<T> items, Random random)
    {
        while (true)
            foreach (var item in items.OrderBy(_ => random.Next()))
                yield return item;
    }

    private static T Next<T>(IEnumerator<T> iterator)
    {
        if (!iterator.MoveNext())
            throw new InvalidOperationException("Seed source list is empty.");
        return iterator.Current;
    }
}

public sealed record SampleSeedResult(int Schools, int Stages, int Years, int Teachers, int Students, int Courses, int Videos, int Payments, int WatchedVideos, int Timelines);