package com.gotrips.gotrips_api.payment;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.Locale;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** Mã đơn: bỏ khoảng trắng hai đầu và đổi chữ hoa trước khi kiểm, để nhân viên gõ "gt7k4q2m" vẫn được. */
public record AssignBankTransactionRequest(
        @Schema(requiredMode = REQUIRED, example = "GT7K4Q2M")
        @NotBlank(message = "Nhập mã đơn.")
        @Pattern(regexp = "^GT[2-9A-HJKMNP-Z]{6}$", message = "Mã đơn gồm GT và 6 ký tự, ví dụ GT7K4Q2M.")
        String bookingCode) {

    public AssignBankTransactionRequest {
        bookingCode = bookingCode == null ? null : bookingCode.strip().toUpperCase(Locale.ROOT);
    }
}
