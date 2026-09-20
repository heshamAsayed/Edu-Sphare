using Microsoft.AspNetCore.Identity;

namespace EduSphare.Domain.Entities.Users
{
    public class ApplicationUser : IdentityUser
    {
        public string Name { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsDeleted { get; private set; }
        public DateTime? DeletedAt { get; set; }

        // A user can have one profile in each independent table.
        public Student? Student { get; set; }
        public Teacher? Teacher { get; set; }


        public void DeleteUser()
        {
            IsDeleted = true;
            DeletedAt = DateTime.UtcNow;
        }
    }
}