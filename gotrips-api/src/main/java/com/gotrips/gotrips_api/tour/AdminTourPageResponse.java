package com.gotrips.gotrips_api.tour;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

public record AdminTourPageResponse(
        @Schema(requiredMode = REQUIRED) List<AdminTourSummaryResponse> items,
        @Schema(requiredMode = REQUIRED) int page,
        @Schema(requiredMode = REQUIRED) int size,
        @Schema(requiredMode = REQUIRED) long totalItems,
        @Schema(requiredMode = REQUIRED) long totalPages) {
}
