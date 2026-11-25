package com.gotrips.gotrips_api.hotel;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;

/** Loại phòng (khớp {@code HotelRoomTypeView} của web: không có {@code hotelId} vì luôn nằm trong một khách sạn). */
@Schema(description = "Loại phòng của khách sạn")
public record HotelRoomTypeResponse(
        @Schema(requiredMode = REQUIRED) long id,
        @Schema(requiredMode = REQUIRED, example = "Phòng Deluxe") String name,
        @Schema(requiredMode = REQUIRED, description = "Giá MỘT phòng MỘT đêm (VND)") long pricePerNight,
        @Schema(requiredMode = REQUIRED, description = "Số khách tối đa MỖI phòng", example = "2") int maxGuests,
        @Schema(requiredMode = REQUIRED, example = "1 giường đôi lớn") String bedType,
        @Schema(requiredMode = REQUIRED, description = "Diện tích (m²)", example = "28") int areaM2) {
}
