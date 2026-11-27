package com.gotrips.gotrips_api.hotel;

import com.gotrips.gotrips_api.common.catalog.CatalogStatus;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record AdminHotelFilters(
        @Schema(description = "Tìm trong tên khách sạn và slug, không phân biệt hoa thường")
        @Size(max = AdminHotelRules.NAME_MAX_LENGTH) String q,
        @Schema(type = "integer", format = "int64") Long destinationId,
        @Schema(description = "Bỏ trống: ACTIVE và HIDDEN. Khách sạn đã xoá chỉ hiện khi lọc rõ DELETED")
        CatalogStatus status,
        @Min(1) @Schema(type = "integer", defaultValue = "1") Integer page,
        @Min(1) @Max(100) @Schema(type = "integer", defaultValue = "20") Integer size,
        @Schema(defaultValue = "NEWEST") AdminHotelSort sort) {

    int pageNumber() {
        return page == null ? 1 : page;
    }

    int pageSize() {
        return size == null ? 20 : size;
    }

    AdminHotelSort order() {
        return sort == null ? AdminHotelSort.NEWEST : sort;
    }
}
