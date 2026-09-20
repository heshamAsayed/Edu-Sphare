namespace EduSphare.Application.Services.Interface.Auth;

/// <summary>
/// Service to retrieve the current authenticated user's information from JWT claims.
/// </summary>
public interface ICurrentUserService
{
    /// <summary>
    /// Gets the current user's ID (NameIdentifier claim).
    /// </summary>
    string? UserId { get; }

    /// <summary>
    /// Gets the current user's email from claims.
    /// </summary>
    string? Email { get; }

    /// <summary>
    /// Gets the current user's role from claims.
    /// </summary>
    string? Role { get; }

    /// <summary>
    /// Checks if the current user is authenticated.
    /// </summary>
    bool IsAuthenticated { get; }
}
