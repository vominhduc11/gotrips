package com.gotrips.gotrips_api.booking;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Người đi tour")
public record BookingTravelerResponse(
        @Schema(requiredMode = REQUIRED) String fullName,
        @Schema(requiredMode = REQUIRED, nullable = true, description = "YYYY-MM-DD; null nếu không nhập")
        LocalDate dateOfBirth) {
}
