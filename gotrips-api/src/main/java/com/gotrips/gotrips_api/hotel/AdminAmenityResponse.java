package com.gotrips.gotrips_api.hotel;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Tiện ích trong danh mục, kèm phạm vi gắn được")
public record AdminAmenityResponse(
        @Schema(requiredMode = REQUIRED, example = "pool") String code,
        @Schema(requiredMode = REQUIRED, example = "Hồ bơi") String name,
        @Schema(requiredMode = REQUIRED, description = "HOTEL: khách sạn; ROOM: loại phòng; BOTH: cả hai")
        AmenityScope scope) {
}
