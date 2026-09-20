using EduSphare.Application.DTOs.Reports;

namespace EduSphare.Application.Services.Interface.Reports;

public interface IFinancialReportService
{
    Task<FinancialReportDto> GetReportAsync(PaymentReportFilterDto filter);
    Task<byte[]> GeneratePdfAsync(PaymentReportFilterDto filter);
}
