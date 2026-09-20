using System.ComponentModel.DataAnnotations;

namespace EduSphare.Application.DTOs.Auth.Student
{
    public class RegisterSTDDto
    {
        [Required(ErrorMessage = "Name is required")]
        [StringLength(100, MinimumLength = 3, ErrorMessage = "Name must be between 3 and 100 characters")]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email is required")]
        [EmailAddress(ErrorMessage = "Invalid email format")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password is required")]
        [StringLength(100, MinimumLength = 6, ErrorMessage = "Password must be at least 6 characters long")]
        public string Password { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password confirmation is required")]
        [Compare("Password", ErrorMessage = "Passwords do not match")]
        public string ConfirmPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "Phone number is required")]
        [Phone(ErrorMessage = "Invalid phone number format")]
        public string Mobile { get; set; } = string.Empty;

        [Required(ErrorMessage = "Year is required")]
        public string YearId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Stage is required")]
        public string StageId { get; set; } = string.Empty;

        [Required(ErrorMessage = "School is required")]
        public string SchoolId { get; set; } = string.Empty;
    }
}
