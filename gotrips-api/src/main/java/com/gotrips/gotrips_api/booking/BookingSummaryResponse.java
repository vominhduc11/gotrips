package com.gotrips.gotrips_api.booking;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonInclude;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Một đơn trong danh sách "đơn của tôi". Phẳng, KHÔNG dùng {@code oneOf}: phân biệt bằng {@code kind}, đúng một trong
 * ba khối {@code tour}/{@code hotel}/{@code flight} có mặt (hai khối kia bị bỏ khỏi JSON). Các trường chung giữ giống
 * {@link BookingDetailResponse}.
 */
@Schema(description = "Đơn đặt chỗ trong danh sách. Có đúng một khối tour/hotel/flight ứng với kind")
public record BookingSummaryResponse(
        @Schema(requiredMode = REQUIRED, example = "GT7K4Q2M") String code,
        @Schema(requiredMode = REQUIRED) BookingKind kind,
        @Schema(requiredMode = REQUIRED) BookingStatus status,
        @Schema(requiredMode = REQUIRED) PaymentStatus paymentStatus,
        @Schema(requiredMode = REQUIRED, description = "Tổng tiền (VND)") long totalAmount,
        @Schema(requiredMode = REQUIRED, description = "Tiền chuyển khoản đã nhận, cộng dồn, không vượt tổng tiền (VND)")
        long receivedAmount,
        @Schema(requiredMode = REQUIRED) Instant createdAt,
        @JsonInclude(JsonInclude.Include.NON_NULL) TourBookingResponse tour,
        @JsonInclude(JsonInclude.Include.NON_NULL) HotelBookingResponse hotel,
        @JsonInclude(JsonInclude.Include.NON_NULL) FlightBookingResponse flight) {
}
