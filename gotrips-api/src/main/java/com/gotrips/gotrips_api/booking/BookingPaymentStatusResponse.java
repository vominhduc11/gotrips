package com.gotrips.gotrips_api.booking;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;

/** Phần nhỏ của đơn mà trang chi tiết hỏi lại định kỳ khi khách đang chờ chuyển khoản. */
@Schema(description = "Trạng thái thanh toán của đơn")
public record BookingPaymentStatusResponse(
        @Schema(requiredMode = REQUIRED, example = "GT7K4Q2M") String code,
        @Schema(requiredMode = REQUIRED) BookingStatus status,
        @Schema(requiredMode = REQUIRED) PaymentStatus paymentStatus,
        @Schema(requiredMode = REQUIRED, description = "Tổng tiền (VND)") long totalAmount,
        @Schema(requiredMode = REQUIRED, description = "Tiền chuyển khoản đã nhận (VND)") long receivedAmount) {
}
