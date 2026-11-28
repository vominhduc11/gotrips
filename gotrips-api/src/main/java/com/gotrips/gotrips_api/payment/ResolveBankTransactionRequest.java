package com.gotrips.gotrips_api.payment;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Bắt buộc ghi chú để sau này biết khoản tiền lệch đã được xử lý thế nào (hoàn cho ai, lúc nào). */
public record ResolveBankTransactionRequest(
        @Schema(requiredMode = REQUIRED, example = "Đã hoàn 500.000 đ cho khách ngày 28/11")
        @NotBlank(message = "Ghi lại cách đã xử lý giao dịch.")
        @Size(max = 500, message = "Ghi chú tối đa 500 ký tự.")
        String note) {

    public ResolveBankTransactionRequest {
        note = note == null ? null : note.strip();
    }
}
