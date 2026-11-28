package com.gotrips.gotrips_api.booking;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Thông tin chuyển khoản của đơn")
public record BankTransferResponse(
        @Schema(requiredMode = REQUIRED) String bankName,
        @Schema(requiredMode = REQUIRED) String accountNumber,
        @Schema(requiredMode = REQUIRED) String accountName,
        @Schema(requiredMode = REQUIRED, description = "Nội dung chuyển khoản = mã đơn") String content,
        @Schema(requiredMode = REQUIRED,
                description = "Số tiền còn phải chuyển (VND): tổng tiền trừ phần đã nhận; 0 khi đơn không còn nhận tiền")
        long amountDue,
        @Schema(requiredMode = REQUIRED, nullable = true,
                description = "Ảnh mã VietQR điền sẵn tài khoản, số tiền còn thiếu và nội dung; null khi chưa cấu hình "
                        + "mã ngân hàng hoặc không còn phải chuyển")
        String qrImageUrl) {
}
