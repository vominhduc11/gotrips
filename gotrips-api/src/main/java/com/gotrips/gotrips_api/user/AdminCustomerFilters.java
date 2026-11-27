package com.gotrips.gotrips_api.user;

import java.util.Locale;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record AdminCustomerFilters(
        @Size(max = 254) @Schema(description = "Tìm theo tên hoặc email") String q,
        @Min(1) @Schema(type = "integer", defaultValue = "1") Integer page,
        @Min(1) @Max(100) @Schema(type = "integer", defaultValue = "20") Integer size,
        @Schema(defaultValue = "CREATED_DESC") AdminCustomerSort sort) {

    int pageNumber() {
        return page == null ? 1 : page;
    }

    int pageSize() {
        return size == null ? 20 : size;
    }

    AdminCustomerSort order() {
        return sort == null ? AdminCustomerSort.CREATED_DESC : sort;
    }

    String searchPattern() {
        if (q == null || q.isBlank()) {
            return null;
        }
        return "%" + q.strip().toLowerCase(Locale.ROOT)
                .replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
    }
}
