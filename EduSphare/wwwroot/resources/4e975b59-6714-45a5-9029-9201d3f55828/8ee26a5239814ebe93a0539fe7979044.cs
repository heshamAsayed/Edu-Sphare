public class PaymentReturnDto
{
    public string Success { get; set; } = default!;
    public string TransactionId { get; set; } = default!;
    public string OrderId { get; set; } = default!;
    public string AmountCents { get; set; } = default!;
    public string Hmac { get; set; } = default!;
    public string IsRefunded { get; set; } = default!;
    public string IntegrationId { get; set; } = default!;
}

[HttpPost("save-result")]
public IActionResult SaveResult(PaymentReturnDto dto)
{
    // في حالة الـ GET Redirect، الـ HMAC بيتحسب على مفاتيح flattened (مش nested زي الـ webhook)
    bool isValid = VerifyRedirectHmac(dto, _options.HmacSecret);

    if (!isValid)
        return BadRequest("HMAC غير صحيح - البيانات مش موثوقة");

    if (dto.Success == "true")
    {
        // احفظ نتيجة الدفع في الداتابيز
        // _orderRepo.MarkAsPaid(dto.OrderId, dto.TransactionId);
    }

    return Ok(new { saved = true });
}