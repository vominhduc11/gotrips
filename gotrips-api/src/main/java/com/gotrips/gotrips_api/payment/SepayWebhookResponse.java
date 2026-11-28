package com.gotrips.gotrips_api.payment;

/**
 * SePay chỉ coi là gửi thành công khi nhận HTTP 200/201 với body đúng {@code {"success": true}} trong 30 giây; thiếu
 * body này thì lần gửi bị ghi thất bại (và KHÔNG được gửi lại).
 */
public record SepayWebhookResponse(boolean success) {

    static final SepayWebhookResponse OK = new SepayWebhookResponse(true);
}
