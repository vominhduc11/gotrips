package com.gotrips.gotrips_api.hotel;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import com.gotrips.gotrips_api.common.catalog.CatalogStatus;

import io.swagger.v3.oas.annotations.media.Schema;

/** Một dòng của danh sách khách sạn ở trang quản trị. Số loại phòng, giá từ và cờ hiện trên website do API tính. */
public record AdminHotelSummaryResponse(
        @Schema(requiredMode = REQUIRED) long id,
        @Schema(requiredMode = REQUIRED) String slug,
        @Schema(requiredMode = REQUIRED) String name,
        @Schema(requiredMode = REQUIRED) long destinationId,
        @Schema(requiredMode = REQUIRED) String destinationName,
        @Schema(requiredMode = REQUIRED, description = "Hạng sao 1–5") int starRating,
        @Schema(requiredMode = REQUIRED) String area,
        @Schema(requiredMode = REQUIRED) String imageUrl,
        @Schema(requiredMode = REQUIRED) String imageAlt,
        @Schema(requiredMode = REQUIRED) CatalogStatus status,
        @Schema(requiredMode = REQUIRED) long roomTypeCount,
        @Schema(requiredMode = REQUIRED) long sellingRoomTypeCount,
        @Schema(requiredMode = REQUIRED, nullable = true,
                description = "Giá một đêm thấp nhất trong mọi loại phòng (VND); null khi chưa có loại phòng")
        Long minPricePerNight,
        @Schema(requiredMode = REQUIRED, description = "Đang hiện trên website: ACTIVE và có ít nhất một loại phòng")
        boolean visibleOnWebsite) {
}
