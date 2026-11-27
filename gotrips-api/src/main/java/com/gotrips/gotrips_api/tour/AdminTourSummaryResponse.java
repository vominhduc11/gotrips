package com.gotrips.gotrips_api.tour;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.LocalDate;

import com.gotrips.gotrips_api.common.catalog.CatalogStatus;

import io.swagger.v3.oas.annotations.media.Schema;

/** Một dòng của danh sách tour ở trang quản trị. Số liệu chuyến do API tính theo "hôm nay" giờ Việt Nam. */
public record AdminTourSummaryResponse(
        @Schema(requiredMode = REQUIRED) long id,
        @Schema(requiredMode = REQUIRED) String slug,
        @Schema(requiredMode = REQUIRED) String title,
        @Schema(requiredMode = REQUIRED) long destinationId,
        @Schema(requiredMode = REQUIRED) String destinationName,
        @Schema(requiredMode = REQUIRED) int durationDays,
        @Schema(requiredMode = REQUIRED) int durationNights,
        @Schema(requiredMode = REQUIRED) String coverImageUrl,
        @Schema(requiredMode = REQUIRED) String coverImageAlt,
        @Schema(requiredMode = REQUIRED) boolean featured,
        @Schema(requiredMode = REQUIRED) CatalogStatus status,
        @Schema(requiredMode = REQUIRED, description = "Số chuyến sau hôm nay, kể cả đã đầy hoặc đã đóng bán")
        long upcomingDepartureCount,
        @Schema(requiredMode = REQUIRED, nullable = true, description = "Ngày của chuyến sắp tới gần nhất")
        LocalDate nextDepartureDate,
        @Schema(requiredMode = REQUIRED, description = "Tổng chỗ còn của các chuyến sắp tới đang mở bán")
        long remainingSeats) {
}
