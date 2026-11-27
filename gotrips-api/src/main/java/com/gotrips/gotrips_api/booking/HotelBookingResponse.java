package com.gotrips.gotrips_api.booking;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Phần riêng của đơn đặt phòng")
public record HotelBookingResponse(
        @Schema(requiredMode = REQUIRED) long roomTypeId,
        @Schema(requiredMode = REQUIRED) String roomTypeName,
        @Schema(requiredMode = REQUIRED) String hotelSlug,
        @Schema(requiredMode = REQUIRED) String hotelName,
        @Schema(requiredMode = REQUIRED) String destinationName,
        @Schema(requiredMode = REQUIRED, description = "Khu vực/địa chỉ ngắn") String area,
        @Schema(requiredMode = REQUIRED) String imageUrl,
        @Schema(requiredMode = REQUIRED) String imageAlt,
        @Schema(requiredMode = REQUIRED, description = "HH:mm") String checkInTime,
        @Schema(requiredMode = REQUIRED, description = "HH:mm") String checkOutTime,
        @Schema(requiredMode = REQUIRED) LocalDate checkIn,
        @Schema(requiredMode = REQUIRED) LocalDate checkOut,
        @Schema(requiredMode = REQUIRED) int nights,
        @Schema(requiredMode = REQUIRED) int rooms,
        @Schema(requiredMode = REQUIRED) int guests,
        @Schema(requiredMode = REQUIRED, description = "Giá một phòng một đêm đã chốt lúc đặt (VND)")
        long pricePerNight,
        @Schema(requiredMode = REQUIRED, description = "Người nhận phòng") String guestName) {
}
