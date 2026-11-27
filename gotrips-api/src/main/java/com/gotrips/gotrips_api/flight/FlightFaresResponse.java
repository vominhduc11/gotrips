package com.gotrips.gotrips_api.flight;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;

/** Giá vé MỘT hành khách mỗi loại cho một chặng (VND), đã gồm thuế phí. */
@Schema(description = "Giá vé một hành khách mỗi loại cho một chặng (VND)")
public record FlightFaresResponse(
        @Schema(requiredMode = REQUIRED) long adult,
        @Schema(requiredMode = REQUIRED) long child,
        @Schema(requiredMode = REQUIRED) long infant) {
}
