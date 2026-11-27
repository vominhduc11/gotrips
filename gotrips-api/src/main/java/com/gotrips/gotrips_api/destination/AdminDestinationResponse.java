package com.gotrips.gotrips_api.destination;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;

/** Điểm đến ở trang quản trị. */
@Schema(description = "Điểm đến kèm số tour và khách sạn đang tham chiếu")
public record AdminDestinationResponse(
        @Schema(requiredMode = REQUIRED) long id,
        @Schema(requiredMode = REQUIRED) String slug,
        @Schema(requiredMode = REQUIRED) String name,
        @Schema(requiredMode = REQUIRED) String region,
        @Schema(requiredMode = REQUIRED) String imageUrl,
        @Schema(requiredMode = REQUIRED) String imageAlt,
        @Schema(requiredMode = REQUIRED, description = "Mọi tour tham chiếu, kể cả đã ẩn và đã xoá mềm")
        long tourCount,
        @Schema(requiredMode = REQUIRED, description = "Mọi khách sạn tham chiếu, kể cả đã ẩn và đã xoá mềm")
        long hotelCount) {
}
