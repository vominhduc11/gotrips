package com.gotrips.gotrips_api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;

/**
 * Tài khoản nhận chuyển khoản hiển thị trong chi tiết đơn ({@code gotrips.payment.bank-transfer.*}). KHÔNG có giá trị
 * mặc định trong Java: dev/Docker lấy giá trị thử nghiệm ở {@code application-seed.yaml}; môi trường thật đặt
 * {@code GOTRIPS_BANK_NAME}, {@code GOTRIPS_BANK_ACCOUNT_NUMBER}, {@code GOTRIPS_BANK_ACCOUNT_NAME}. Thiếu thì API
 * không khởi động (thà dừng còn hơn hướng khách chuyển tiền vào chỗ trống).
 */
@Validated
@ConfigurationProperties(prefix = "gotrips.payment.bank-transfer")
public record BankTransferProperties(
        @NotBlank(message = "Chưa cấu hình tên ngân hàng nhận chuyển khoản (GOTRIPS_BANK_NAME).")
        String bankName,
        @NotBlank(message = "Chưa cấu hình số tài khoản nhận chuyển khoản (GOTRIPS_BANK_ACCOUNT_NUMBER).")
        String accountNumber,
        @NotBlank(message = "Chưa cấu hình chủ tài khoản nhận chuyển khoản (GOTRIPS_BANK_ACCOUNT_NAME).")
        String accountName) {
}
