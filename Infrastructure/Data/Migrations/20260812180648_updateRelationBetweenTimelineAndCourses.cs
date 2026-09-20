using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduSphare.Data.Migrations
{
    /// <inheritdoc />
    public partial class updateRelationBetweenTimelineAndCourses : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Courses_Stages_StageId",
                table: "Courses");

            migrationBuilder.AddForeignKey(
                name: "FK_Courses_Stages_StageId",
                table: "Courses",
                column: "StageId",
                principalTable: "Stages",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Courses_Stages_StageId",
                table: "Courses");

            migrationBuilder.AddForeignKey(
                name: "FK_Courses_Stages_StageId",
                table: "Courses",
                column: "StageId",
                principalTable: "Stages",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
