using EduSphare.Application.DependencyInjection;
using EduSphare.Domain.Entities.Users;
using EduSphare.Infrastructure.Data;
using EduSphare.Infrastructure.DependencyInjection;
using EduSphare.Web.Middleware;
using EduSphare.Web.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Razor;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using System.Security.Claims;
using System.Text;

namespace EduSphare.Web;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

        builder.Services.AddDbContext<ApplicationDbContext>(options =>
            options.UseSqlServer(connectionString, sqlOptions =>
            {
                sqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 5,
                    maxRetryDelay: TimeSpan.FromSeconds(30),
                    errorNumbersToAdd: null);
                sqlOptions.CommandTimeout(60);
            }));
        builder.Services.AddDatabaseDeveloperPageExceptionFilter();

        // Identity as user/password/role store only — NO Identity UI (no AddDefaultIdentity / AddDefaultUI).
        builder.Services
            .AddIdentityCore<ApplicationUser>(options =>
            {
                options.SignIn.RequireConfirmedAccount = false;
                options.User.RequireUniqueEmail = true;
            })
            .AddRoles<IdentityRole>()
            .AddEntityFrameworkStores<ApplicationDbContext>()
            .AddSignInManager()
            .AddDefaultTokenProviders();

        // Configure Kestrel limits for large video uploads up to 4GB
        builder.WebHost.ConfigureKestrel(options =>
        {
            options.Limits.MaxRequestBodySize = 4_294_967_296; // 4GB
            options.Limits.KeepAliveTimeout = TimeSpan.FromHours(2);
            options.Limits.RequestHeadersTimeout = TimeSpan.FromHours(2);
        });

        // Configure FormOptions for multipart body uploads up to 4GB
        builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
        {
            options.MultipartBodyLengthLimit = 4_294_967_296; // 4GB
            options.ValueLengthLimit = int.MaxValue;
            options.MultipartHeadersLengthLimit = int.MaxValue;
        });

        builder.Services.AddControllersWithViews();


        var jwtKey = builder.Configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("Jwt:Key is missing.");
        var jwtCookieName = builder.Configuration["Jwt:CookieName"] ?? "EduSphare.AccessToken";
        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));

        builder.Services
            .AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = signingKey,
                    ValidateIssuer = true,
                    ValidIssuer = builder.Configuration["Jwt:Issuer"],
                    ValidateAudience = true,
                    ValidAudience = builder.Configuration["Jwt:Audience"],
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromMinutes(1),
                    RoleClaimType = ClaimTypes.Role,
                    NameClaimType = ClaimTypes.NameIdentifier
                };

                // Prefer Authorization header (Swagger); otherwise read JWT from HttpOnly cookie.
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        if (string.IsNullOrEmpty(context.Token)
                            && context.Request.Cookies.TryGetValue(jwtCookieName, out var cookieToken)
                            && !string.IsNullOrWhiteSpace(cookieToken))
                        {
                            context.Token = cookieToken;
                        }

                        return Task.CompletedTask;
                    }
                };
            });

        builder.Services.AddAuthorization();

        builder.Services.Configure<RazorViewEngineOptions>(options =>
        {
            options.ViewLocationFormats.Clear();
            options.ViewLocationFormats.Add("/Web/Views/{1}/{0}.cshtml");
            options.ViewLocationFormats.Add("/Web/Views/Shared/{0}.cshtml");
        });

        builder.Services.AddInfrastructureServices(builder.Configuration);
        builder.Services.AddApplicationServices();
        builder.Services.AddScoped<DataSampleSeeder>();

        builder.Services.AddHttpContextAccessor();

        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen(options =>
        {
            options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Name = "Authorization",
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                In = ParameterLocation.Header,
                Description = "Paste the JWT from POST /api/Account/login. Optional if the HttpOnly auth cookie is already set."
            });
            options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
            {
                [new OpenApiSecuritySchemeReference("Bearer", document)] = []
            });
        });


        builder.Services.AddCors(options =>
        {
            options.AddPolicy("AngularPolicy", policy =>
            {
                policy
                    .WithOrigins("http://localhost:4200")
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials();
            });
        });

        var app = builder.Build();


        app.UseSwagger();
        app.UseSwaggerUI(options =>
        {
            options.RoutePrefix = string.Empty;
            options.SwaggerEndpoint("/swagger/v1/swagger.json", "EduSphare API v1");
            options.EnablePersistAuthorization();
        });

        if (app.Environment.IsDevelopment())
        {
            app.UseMigrationsEndPoint();
        }
        else
        {
            app.UseExceptionHandler(errorApp => errorApp.Run(async context =>
            {
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                await context.Response.WriteAsJsonAsync(new { message = "An unexpected error occurred." });
            }));
            app.UseHsts();
        }

        app.UseCors("AngularPolicy");
        app.UseHttpsRedirection();
        // Attachments are created after deployment, so they are not part of the
        // build-time static-assets manifest. Serve wwwroot/resources at runtime.
        app.UseStaticFiles();
        app.UseRouting();

        app.UseAuthentication();
        app.UseAuthorization();

        // Browser GET /api/Courses/{id} → /Learning/Lesson/{id} (API JSON method unchanged).
        app.UseMiddleware<CourseLessonBridgeMiddleware>();

        app.MapControllers();
        app.MapStaticAssets();
        app.MapControllerRoute(
            name: "default",
            pattern: "{controller=Home}/{action=Index}/{id?}")
            .WithStaticAssets();
        // No MapRazorPages() — Identity UI pages are not used.

        app.Run();
    }
}
