package com.gotrips.gotrips_api.user;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record AdminStaffRoleRequest(
        @Schema(requiredMode = REQUIRED)
        @NotNull(message = "Vui lòng chọn vai trò.")
        AdminStaffRole role) {
}
