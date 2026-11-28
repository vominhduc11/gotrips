package com.gotrips.gotrips_api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Webhook SePay ({@code gotrips.payment.sepay.*}).
 *
 * @param webhookSecret Secret Key của kiểu xác thực HMAC-SHA256 đặt ở SePay ({@code GOTRIPS_SEPAY_WEBHOOK_SECRET}).
 *     Tuỳ chọn: để trống thì API tắt nhận webhook (dev không có SePay vẫn chạy được), nhân viên vẫn đánh dấu đã thu
 *     bằng tay. KHÔNG có giá trị mặc định: khoá lộ thì ai cũng giả được tiền vào.
 */
@ConfigurationProperties(prefix = "gotrips.payment.sepay")
public record SepayProperties(String webhookSecret) {

    public boolean webhookEnabled() {
        return webhookSecret != null && !webhookSecret.isBlank();
    }
}
