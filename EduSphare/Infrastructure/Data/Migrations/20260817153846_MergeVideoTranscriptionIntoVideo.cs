using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduSphare.Data.Migrations
{
    /// <inheritdoc />
    public partial class MergeVideoTranscriptionIntoVideo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "GeneratedQuestionsJson",
                table: "Videos",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TranscriptionError",
                table: "Videos",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TranscriptionStatus",
                table: "Videos",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "Pending");

            migrationBuilder.AddColumn<string>(
                name: "TranscriptionText",
                table: "Videos",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql("""
                UPDATE v SET
                    v.TranscriptionText = t.TranscriptionText,
                    v.TranscriptionStatus = t.Status,
                    v.TranscriptionError = t.ErrorMessage,
                    v.GeneratedQuestionsJson = t.GeneratedQuestionsJson
                FROM Videos v
                INNER JOIN VideoTranscriptions t ON t.VideoId = v.Id;
                """);

            migrationBuilder.DropTable(
                name: "VideoTranscriptions");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GeneratedQuestionsJson",
                table: "Videos");

            migrationBuilder.DropColumn(
                name: "TranscriptionError",
                table: "Videos");

            migrationBuilder.DropColumn(
                name: "TranscriptionStatus",
                table: "Videos");

            migrationBuilder.DropColumn(
                name: "TranscriptionText",
                table: "Videos");

            migrationBuilder.CreateTable(
                name: "VideoTranscriptions",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    VideoId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ErrorMessage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    GeneratedQuestionsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TranscriptionText = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VideoTranscriptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VideoTranscriptions_Videos_VideoId",
                        column: x => x.VideoId,
                        principalTable: "Videos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_VideoTranscriptions_VideoId",
                table: "VideoTranscriptions",
                column: "VideoId");
        }
    }
}
