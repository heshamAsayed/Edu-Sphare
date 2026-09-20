using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduSphare.Data.Migrations
{
    /// <inheritdoc />
    public partial class UPdateVIdeoWatchedEntity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "QuizAnswersJson",
                table: "WatchedVideos",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "QuizCompletedAt",
                table: "WatchedVideos",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "QuizResultsJson",
                table: "WatchedVideos",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "QuizAnswersJson",
                table: "WatchedVideos");

            migrationBuilder.DropColumn(
                name: "QuizCompletedAt",
                table: "WatchedVideos");

            migrationBuilder.DropColumn(
                name: "QuizResultsJson",
                table: "WatchedVideos");
        }
    }
}
