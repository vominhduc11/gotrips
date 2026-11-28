package com.gotrips.gotrips_api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Tài khoản nhận chuyển khoản hiển thị trong chi tiết đơn ({@code gotrips.payment.bank-transfer.*}). KHÔNG có giá trị
 * mặc định trong Java: dev/Docker lấy giá trị thử nghiệm ở {@code application-seed.yaml}; môi trường thật đặt
 * {@code GOTRIPS_BANK_NAME}, {@code GOTRIPS_BANK_ACCOUNT_NUMBER}, {@code GOTRIPS_BANK_ACCOUNT_NAME}. Thiếu thì API
 * không khởi động (thà dừng còn hơn hướng khách chuyển tiền vào chỗ trống).
 *
 * <p>Đây cũng là tài khoản mà webhook SePay phải báo về: giao dịch vào tài khoản khác không được tự tính vào đơn.
 *
 * @param qrBankCode mã ngân hàng cho ảnh VietQR ({@code GOTRIPS_BANK_QR_CODE}, ví dụ {@code VCB} hoặc mã BIN
 *     {@code 970436}). Tuỳ chọn: để trống thì trang đơn không hiện mã QR, khách vẫn chuyển tay được.
 */
@Validated
@ConfigurationProperties(prefix = "gotrips.payment.bank-transfer")
public record BankTransferProperties(
        @NotBlank(message = "Chưa cấu hình tên ngân hàng nhận chuyển khoản (GOTRIPS_BANK_NAME).")
        String bankName,
        @NotBlank(message = "Chưa cấu hình số tài khoản nhận chuyển khoản (GOTRIPS_BANK_ACCOUNT_NUMBER).")
        String accountNumber,
        @NotBlank(message = "Chưa cấu hình chủ tài khoản nhận chuyển khoản (GOTRIPS_BANK_ACCOUNT_NAME).")
        String accountName,
        @Pattern(regexp = "^[A-Za-z0-9]{0,20}$",
                message = "Mã ngân hàng cho VietQR (GOTRIPS_BANK_QR_CODE) chỉ gồm chữ và số, ví dụ VCB hoặc 970436.")
        String qrBankCode) {

    /** Số tài khoản chỉ còn chữ và số (bỏ khoảng trắng, dấu gạch) để so với webhook và ghép vào ảnh QR. */
    public String normalizedAccountNumber() {
        return normalizeAccountNumber(accountNumber);
    }

    public static String normalizeAccountNumber(String value) {
        return value == null ? "" : value.replaceAll("[^A-Za-z0-9]", "");
    }

    public boolean hasQrBankCode() {
        return qrBankCode != null && !qrBankCode.isBlank();
    }
}
