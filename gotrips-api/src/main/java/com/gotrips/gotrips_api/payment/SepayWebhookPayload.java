package com.gotrips.gotrips_api.payment;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/**
 * Body webhook của SePay (developer.sepay.vn/vi/sepay-webhooks/tich-hop-webhook). Chỉ khai các trường dùng tới; các
 * trường khác ({@code accumulated}, {@code subAccount}, {@code description}...) bị bỏ qua. Giới hạn độ dài khớp cột của
 * {@code bank_transactions}.
 *
 * @param id id giao dịch trên SePay, không đổi qua các lần gửi lại (khoá chống trùng). Lần "Gửi thử" có thể là 0.
 * @param transactionDate giờ Việt Nam, {@code YYYY-MM-DD HH:mm:ss}
 * @param code mã thanh toán SePay tách được theo cấu hình; null hoặc rỗng khi không tách được
 * @param transferType {@code in} (tiền vào) hoặc {@code out} (tiền ra, bỏ qua)
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record SepayWebhookPayload(
        @NotNull(message = "Thiếu id giao dịch.") @PositiveOrZero(message = "id giao dịch không hợp lệ.") Long id,
        @NotBlank(message = "Thiếu tên ngân hàng.") @Size(max = 100) String gateway,
        @NotNull(message = "Thiếu thời điểm giao dịch.")
        @Pattern(regexp = "\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}",
                message = "Thời điểm giao dịch phải theo định dạng YYYY-MM-DD HH:mm:ss.")
        String transactionDate,
        @NotBlank(message = "Thiếu số tài khoản.") @Size(max = 50) String accountNumber,
        @Size(max = 50) String code,
        @NotNull(message = "Thiếu nội dung chuyển khoản.") @Size(max = 2000) String content,
        @NotNull(message = "Thiếu loại giao dịch.")
        @Pattern(regexp = "in|out", message = "Loại giao dịch phải là in hoặc out.")
        String transferType,
        @NotNull(message = "Thiếu số tiền.") @Positive(message = "Số tiền phải lớn hơn 0.") Long transferAmount,
        @Size(max = 255) String referenceCode) {

    boolean incoming() {
        return "in".equals(transferType);
    }
}
