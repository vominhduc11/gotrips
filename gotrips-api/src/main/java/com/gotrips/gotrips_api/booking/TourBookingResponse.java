package com.gotrips.gotrips_api.booking;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.LocalDate;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Phần riêng của đơn tour")
public record TourBookingResponse(
        @Schema(requiredMode = REQUIRED) long departureId,
        @Schema(requiredMode = REQUIRED) String tourSlug,
        @Schema(requiredMode = REQUIRED) String tourTitle,
        @Schema(requiredMode = REQUIRED) String destinationName,
        @Schema(requiredMode = REQUIRED) String coverImage,
        @Schema(requiredMode = REQUIRED) String coverImageAlt,
        @Schema(requiredMode = REQUIRED, description = "Nơi tập trung/khởi hành") String departureCity,
        @Schema(requiredMode = REQUIRED) int durationDays,
        @Schema(requiredMode = REQUIRED) int durationNights,
        @Schema(requiredMode = REQUIRED, description = "Ngày khởi hành (YYYY-MM-DD)") LocalDate departureDate,
        @Schema(requiredMode = REQUIRED) int guests,
        @Schema(requiredMode = REQUIRED, description = "Giá mỗi khách đã chốt lúc đặt (VND)") long unitPrice,
        @Schema(requiredMode = REQUIRED) List<BookingTravelerResponse> travelers) {
}
