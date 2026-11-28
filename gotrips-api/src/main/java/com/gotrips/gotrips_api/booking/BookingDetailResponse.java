package com.gotrips.gotrips_api.booking;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonInclude;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Chi tiết một đơn: các trường chung của {@link BookingSummaryResponse} (giữ giống nhau) + người liên hệ, ghi chú, các
 * mốc thời gian và thông tin chuyển khoản. Trả DỮ LIỆU có cấu trúc, không trả câu chữ giao diện.
 */
@Schema(description = "Chi tiết đơn đặt chỗ. Có đúng một khối tour/hotel/flight ứng với kind")
public record BookingDetailResponse(
        @Schema(requiredMode = REQUIRED, example = "GT7K4Q2M") String code,
        @Schema(requiredMode = REQUIRED) BookingKind kind,
        @Schema(requiredMode = REQUIRED) BookingStatus status,
        @Schema(requiredMode = REQUIRED) PaymentStatus paymentStatus,
        @Schema(requiredMode = REQUIRED, description = "Tổng tiền (VND)") long totalAmount,
        @Schema(requiredMode = REQUIRED, description = "Tiền chuyển khoản đã nhận, cộng dồn, không vượt tổng tiền (VND)")
        long receivedAmount,
        @Schema(requiredMode = REQUIRED) Instant createdAt,
        @Schema(requiredMode = REQUIRED) BookingContactResponse contact,
        @Schema(requiredMode = REQUIRED, nullable = true) String note,
        @Schema(requiredMode = REQUIRED, nullable = true) Instant paidAt,
        @Schema(requiredMode = REQUIRED, nullable = true) Instant confirmedAt,
        @Schema(requiredMode = REQUIRED, nullable = true) Instant cancelledAt,
        @Schema(requiredMode = REQUIRED) BankTransferResponse bankTransfer,
        @JsonInclude(JsonInclude.Include.NON_NULL) TourBookingResponse tour,
        @JsonInclude(JsonInclude.Include.NON_NULL) HotelBookingResponse hotel,
        @JsonInclude(JsonInclude.Include.NON_NULL) FlightBookingResponse flight) {
}
