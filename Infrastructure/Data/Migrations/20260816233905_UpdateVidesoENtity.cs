using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduSphare.Data.Migrations
{
    /// <inheritdoc />
    public partial class UpdateVidesoENtity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "AbsentMarkedAt",
                table: "WatchedVideos",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsAbsent",
                table: "WatchedVideos",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "AvailabilityDays",
                table: "Videos",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "VideoAttachments",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    VideoId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    OriginalFileName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    StoredFileName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ContentType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Length = table.Column<long>(type: "bigint", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VideoAttachments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VideoAttachments_Videos_VideoId",
                        column: x => x.VideoId,
                        principalTable: "Videos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_VideoAttachments_VideoId",
                table: "VideoAttachments",
                column: "VideoId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VideoAttachments");

            migrationBuilder.DropColumn(
                name: "AbsentMarkedAt",
                table: "WatchedVideos");

            migrationBuilder.DropColumn(
                name: "IsAbsent",
                table: "WatchedVideos");

            migrationBuilder.DropColumn(
                name: "AvailabilityDays",
                table: "Videos");
        }
    }
}
