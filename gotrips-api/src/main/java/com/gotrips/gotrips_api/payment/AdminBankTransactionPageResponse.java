package com.gotrips.gotrips_api.payment;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

public record AdminBankTransactionPageResponse(
        @Schema(requiredMode = REQUIRED) List<AdminBankTransactionResponse> items,
        @Schema(requiredMode = REQUIRED) int page,
        @Schema(requiredMode = REQUIRED) int size,
        @Schema(requiredMode = REQUIRED) long totalItems,
        @Schema(requiredMode = REQUIRED) long totalPages) {
}
