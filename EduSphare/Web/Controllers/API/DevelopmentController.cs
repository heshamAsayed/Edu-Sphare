using EduSphare.Web.Services;
using Microsoft.AspNetCore.Mvc;

namespace EduSphare.Web.Controllers.API;

[Route("api/development")]
[ApiController]
public sealed class DevelopmentController(IHostEnvironment environment, DataSampleSeeder dataSampleSeeder) : ControllerBase
{
    [HttpPost("seed-sample-data")]
    public async Task<IActionResult> SeedSampleData(CancellationToken cancellationToken)
    {
        if (!environment.IsDevelopment())
            return NotFound();

        try
        {
            return Ok(await dataSampleSeeder.SeedAsync(cancellationToken));
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(new { message = exception.Message });
        }
    }
}
