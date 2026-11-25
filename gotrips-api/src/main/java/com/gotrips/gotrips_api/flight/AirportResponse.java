package com.gotrips.gotrips_api.flight;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;

/** Sân bay (khớp {@code Airport} của web). */
@Schema(description = "Sân bay")
public record AirportResponse(
        @Schema(requiredMode = REQUIRED, description = "Mã IATA, 3 chữ in hoa", example = "HAN") String code,
        @Schema(requiredMode = REQUIRED, example = "Sân bay Nội Bài") String name,
        @Schema(requiredMode = REQUIRED, description = "Thành phố/khu vực phục vụ", example = "Hà Nội") String city) {
}
