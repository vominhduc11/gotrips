package com.gotrips.gotrips_api.user;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

public record AdminStaffResponse(
        @Schema(requiredMode = REQUIRED) UUID id,
        @Schema(requiredMode = REQUIRED) String fullName,
        @Schema(requiredMode = REQUIRED) String email,
        @Schema(requiredMode = REQUIRED) AdminStaffRole role,
        @Schema(requiredMode = REQUIRED) Instant createdAt) {
}
