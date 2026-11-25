package com.gotrips.gotrips_api.flight;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;

/** Thẻ chặng bay phổ biến (khớp {@code FlightRouteCardView} của web). */
@Schema(description = "Chặng bay phổ biến kèm giá tham khảo")
public record FlightRouteCardResponse(
        @Schema(requiredMode = REQUIRED) long id,
        @Schema(requiredMode = REQUIRED, description = "Sân bay đi") AirportResponse from,
        @Schema(requiredMode = REQUIRED, description = "Sân bay đến (khác sân bay đi)") AirportResponse to,
        @Schema(requiredMode = REQUIRED, example = "125") int durationMinutes,
        @Schema(requiredMode = REQUIRED, description = "Giá tham khảo một chiều cho một hành khách (VND), không phải giá bán")
        long referencePrice,
        @Schema(requiredMode = REQUIRED) String imageUrl,
        @Schema(requiredMode = REQUIRED) String imageAlt) {
}
