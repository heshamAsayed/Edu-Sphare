using EduSphare.Domain.Entities;
using EduSphare.Domain.Entities.Main;
using EduSphare.Domain.Entities.Users;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace EduSphare.Infrastructure.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<School> Schools { get; set; }
        public DbSet<Stage> Stages { get; set; }
        public DbSet<Year> Years { get; set; }
        public DbSet<Student> Students { get; set; }
        public DbSet<Teacher> Teachers { get; set; }
        public DbSet<TeacherStage> TeacherStages { get; set; }
        public DbSet<Course> Courses { get; set; }
        public DbSet<StudentCoursePaid> StudentCoursePaids { get; set; }
        public DbSet<Video> Videos { get; set; }
        public DbSet<WatchedVideo> WatchedVideos { get; set; }
        public DbSet<TimeLine> TimeLines { get; set; }
        public DbSet<VideoAttachment> VideoAttachments { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // Configure relationships and constraints

            // School -> Stage (One-to-Many)
            builder.Entity<Stage>()
                .HasOne(s => s.School)
                .WithMany(sch => sch.Stages)
                .HasForeignKey(s => s.SchoolId)
                .OnDelete(DeleteBehavior.Restrict);

            // Stage -> Year (One-to-Many)
            builder.Entity<Year>()
                .HasOne(y => y.Stage)
                .WithMany(s => s.Years)
                .HasForeignKey(y => y.StageId)
                .OnDelete(DeleteBehavior.Restrict);

            // Year -> Student (One-to-Many)
            builder.Entity<Student>()
                .HasOne(st => st.Year)
                .WithMany()
                .HasForeignKey(st => st.YearId)
                .OnDelete(DeleteBehavior.Restrict);

            // Student and Teacher are distinct profile tables, not Identity roles.
            builder.Entity<Student>()
                .HasKey(st => st.ApplicationUserId);

            builder.Entity<Student>()
                .HasOne(st => st.ApplicationUser)
                .WithOne(au => au.Student)
                .HasForeignKey<Student>(st => st.ApplicationUserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Teacher>()
                .HasKey(t => t.ApplicationUserId);

            builder.Entity<Teacher>()
                .HasOne(t => t.ApplicationUser)
                .WithOne(au => au.Teacher)
                .HasForeignKey<Teacher>(t => t.ApplicationUserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Teacher>()
                .HasOne(t => t.School)
                .WithMany()
                .HasForeignKey(t => t.SchoolId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<TeacherStage>()
                .HasKey(ts => new { ts.TeacherId, ts.StageId });

            builder.Entity<TeacherStage>()
                .HasOne(ts => ts.Teacher)
                .WithMany(t => t.TeacherStages)
                .HasForeignKey(ts => ts.TeacherId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<TeacherStage>()
                .HasOne(ts => ts.Stage)
                .WithMany()
                .HasForeignKey(ts => ts.StageId)
                .OnDelete(DeleteBehavior.Cascade);

            // Year -> Course (One-to-Many)
            builder.Entity<Course>()
                .HasOne(c => c.Year)
                .WithMany()
                .HasForeignKey(c => c.YearId)
                .OnDelete(DeleteBehavior.Restrict);

            // Student -> StudentCoursePaid (One-to-Many)
            builder.Entity<StudentCoursePaid>()
                .HasOne(scp => scp.Student)
                .WithMany(st => st.StudentCoursePaids)
                .HasForeignKey(scp => scp.StudentId)
                .OnDelete(DeleteBehavior.Restrict);

            // Course -> StudentCoursePaid (One-to-Many)
            builder.Entity<StudentCoursePaid>()
                .HasOne(scp => scp.Course)
                .WithMany(c => c.StudentCoursePaids)
                .HasForeignKey(scp => scp.CourseId)
                .OnDelete(DeleteBehavior.Restrict);

            // Teacher -> StudentCoursePaid (One-to-Many)
            builder.Entity<StudentCoursePaid>()
                .HasOne(scp => scp.Teacher)
                .WithMany(t => t.StudentCoursePaids)
                .HasForeignKey(scp => scp.TeacherId)
                .OnDelete(DeleteBehavior.Restrict);

            // Teacher -> Course (Many-to-Many or One-to-Many depending on requirements)
            // Assuming a teacher can have many courses and a course belongs to a teacher
            // If implementing as Many-to-Many, this would need a join table
            // For now, implementing as implicit based on entity definitions
            builder.Entity<Course>()
                .HasMany(c => c.teachers)
                .WithMany(t => t.Courses)
                .UsingEntity(j => j.ToTable("CourseTeacher"));

            // Course -> Video (One-to-Many)
            builder.Entity<Video>()
                .HasOne(v => v.Course)
                .WithMany(c => c.Videos)
                .HasForeignKey(v => v.CourseId)
                .OnDelete(DeleteBehavior.Cascade);

            // Unique constraint: No two videos in the same course can have the same SortOrder
            builder.Entity<Video>()
                .HasIndex(v => new { v.CourseId, v.SortOrder })
                .IsUnique();

            builder.Entity<VideoAttachment>()
                .HasOne(a => a.Video)
                .WithMany(v => v.Attachments)
                .HasForeignKey(a => a.VideoId)
                .OnDelete(DeleteBehavior.Cascade);

            // Video -> WatchedVideo (One-to-Many)
            builder.Entity<WatchedVideo>()
                .HasOne(wv => wv.Video)
                .WithMany(v => v.WatchedVideos)
                .HasForeignKey(wv => wv.VideoId)
                .OnDelete(DeleteBehavior.Cascade);

            // Student -> WatchedVideo (One-to-Many)
            builder.Entity<WatchedVideo>()
                .HasOne(wv => wv.Student)
                .WithMany(st => st.WatchedVideos)
                .HasForeignKey(wv => wv.StudentId)
                .OnDelete(DeleteBehavior.Restrict);

            // TimeLine references two courses; Cascade on both relations creates multiple
            // cascade paths in SQL Server, so deleting a course is restricted.
            builder.Entity<TimeLine>()
                .HasOne(tl => tl.CurrentCourse)
                .WithMany()
                .HasForeignKey(tl => tl.CurrentCourseId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<TimeLine>()
                .HasOne(tl => tl.NextCourse)
                .WithOne(c => c.TimeLine)
                .HasForeignKey<TimeLine>(tl => tl.NextCourseId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
