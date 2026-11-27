package com.gotrips.gotrips_api.booking;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Thông tin chuyển khoản của đơn")
public record BankTransferResponse(
        @Schema(requiredMode = REQUIRED) String bankName,
        @Schema(requiredMode = REQUIRED) String accountNumber,
        @Schema(requiredMode = REQUIRED) String accountName,
        @Schema(requiredMode = REQUIRED, description = "Nội dung chuyển khoản = mã đơn") String content) {
}
