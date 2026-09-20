namespace EduSphare.Web.Middleware;

/// <summary>
/// Bridges GET /api/Courses/{id} browser navigations to MVC Learning/Lesson/{id}
/// without changing CoursesController.GetCourseById (JSON API stays as-is).
/// </summary>
public sealed class CourseLessonBridgeMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        if (ShouldOpenLessonPage(context, out var courseId))
        {
            context.Response.Redirect($"/Learning/Lesson/{Uri.EscapeDataString(courseId)}");
            return;
        }

        await next(context);
    }

    private static bool ShouldOpenLessonPage(HttpContext context, out string courseId)
    {
        courseId = string.Empty;

        if (!HttpMethods.IsGet(context.Request.Method))
            return false;

        var path = context.Request.Path.Value ?? string.Empty;
        const string prefix = "/api/Courses/";
        if (!path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            return false;

        var id = path[prefix.Length..].Trim('/');
        if (string.IsNullOrWhiteSpace(id) || id.Contains('/', StringComparison.Ordinal))
            return false;

        // Keep JSON clients (Swagger, fetch with application/json) on the API action.
        // Browser address-bar / link navigations send text/html and open the Lesson page.
        var accept = context.Request.Headers.Accept.ToString();
        var wantsHtml = accept.Contains("text/html", StringComparison.OrdinalIgnoreCase);
        var wantsJson = accept.Contains("application/json", StringComparison.OrdinalIgnoreCase);
        var forceLesson = string.Equals(
            context.Request.Query["open"],
            "lesson",
            StringComparison.OrdinalIgnoreCase);

        if (!forceLesson && (!wantsHtml || wantsJson))
            return false;

        courseId = id;
        return true;
    }
}
