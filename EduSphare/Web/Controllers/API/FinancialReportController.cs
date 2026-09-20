using EduSphare.Application.DTOs.Reports;
using EduSphare.Application.Services.Interface.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduSphare.Web.Controllers.API;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class FinancialReportController(IFinancialReportService reportService) : ControllerBase
{
    /// <summary>
    /// Returns paid courses with optional filters (student id, teacher id/name/email, course id/name, date range).
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(FinancialReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetReport([FromQuery] PaymentReportFilterDto filter)
    {
        var report = await reportService.GetReportAsync(filter);
        return Ok(report);
    }

    /// <summary>
    /// Downloads the same filtered report as PDF.
    /// </summary>
    [HttpGet("pdf")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> DownloadPdf([FromQuery] PaymentReportFilterDto filter)
    {
        var pdf = await reportService.GeneratePdfAsync(filter);
        var fileName = $"financial-report-{DateTime.UtcNow:yyyyMMdd-HHmmss}.pdf";
        return File(pdf, "application/pdf", fileName);
    }
}
