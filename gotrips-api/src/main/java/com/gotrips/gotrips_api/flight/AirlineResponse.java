package com.gotrips.gotrips_api.flight;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;

/** Hãng bay. */
@Schema(description = "Hãng bay")
public record AirlineResponse(
        @Schema(requiredMode = REQUIRED, example = "SV") String code,
        @Schema(requiredMode = REQUIRED, example = "Sao Việt Air") String name) {
}
