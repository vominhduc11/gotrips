package com.gotrips.gotrips_api.tour;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import com.gotrips.gotrips_api.common.catalog.CatalogStatus;

import io.swagger.v3.oas.annotations.media.Schema;

/** Mọi trường sửa được của một tour, kèm phần chỉ đọc. */
public record AdminTourDetailResponse(
        @Schema(requiredMode = REQUIRED) long id,
        @Schema(requiredMode = REQUIRED) String slug,
        @Schema(requiredMode = REQUIRED) String title,
        @Schema(requiredMode = REQUIRED) long destinationId,
        @Schema(requiredMode = REQUIRED) String destinationName,
        @Schema(requiredMode = REQUIRED) int durationDays,
        @Schema(requiredMode = REQUIRED) int durationNights,
        @Schema(requiredMode = REQUIRED) String departureCity,
        @Schema(requiredMode = REQUIRED) String shortDescription,
        @Schema(requiredMode = REQUIRED) String coverImageUrl,
        @Schema(requiredMode = REQUIRED) String coverImageAlt,
        @Schema(requiredMode = REQUIRED) boolean featured,
        @Schema(requiredMode = REQUIRED) CatalogStatus status,
        @Schema(requiredMode = REQUIRED, description = "Điểm trung bình 0–5 (chỉ đọc)") double rating,
        @Schema(requiredMode = REQUIRED, description = "Số đánh giá (chỉ đọc)") int reviewCount,
        @Schema(requiredMode = REQUIRED, description = "Số chuyến khách còn đặt được: sau hôm nay, mở bán, còn chỗ")
        int openDepartureCount) {
}
