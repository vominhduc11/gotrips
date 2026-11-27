package com.gotrips.gotrips_api.tour;

import com.gotrips.gotrips_api.common.catalog.CatalogStatus;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record AdminTourFilters(
        @Schema(description = "Tìm trong tên tour và slug, không phân biệt hoa thường")
        @Size(max = 150) String q,
        @Schema(type = "integer", format = "int64") Long destinationId,
        @Schema(description = "Bỏ trống: ACTIVE và HIDDEN. Tour đã xoá chỉ hiện khi lọc rõ DELETED")
        CatalogStatus status,
        Boolean featured,
        @Min(1) @Schema(type = "integer", defaultValue = "1") Integer page,
        @Min(1) @Max(100) @Schema(type = "integer", defaultValue = "20") Integer size,
        @Schema(defaultValue = "NEWEST") AdminTourSort sort) {

    int pageNumber() {
        return page == null ? 1 : page;
    }

    int pageSize() {
        return size == null ? 20 : size;
    }

    AdminTourSort order() {
        return sort == null ? AdminTourSort.NEWEST : sort;
    }
}
