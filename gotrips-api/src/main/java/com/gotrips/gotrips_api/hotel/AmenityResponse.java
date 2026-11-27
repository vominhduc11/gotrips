package com.gotrips.gotrips_api.hotel;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Tiện ích trong danh mục chuẩn")
public record AmenityResponse(
        @Schema(requiredMode = REQUIRED, description = "Mã cố định của tiện ích; client chọn biểu tượng theo mã này",
                example = "pool")
        String code,
        @Schema(requiredMode = REQUIRED, example = "Hồ bơi") String name) {
}
