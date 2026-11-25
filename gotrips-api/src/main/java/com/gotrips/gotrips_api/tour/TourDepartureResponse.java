package com.gotrips.gotrips_api.tour;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Một chuyến khởi hành ở trang chi tiết tour (khớp {@code TourDepartureView} của web). Chỉ có chuyến ở tương lai;
 * chuyến đã đầy vẫn có để khách thấy lịch (nhãn "Hết chỗ").
 */
@Schema(description = "Chuyến khởi hành của tour, kèm số chỗ còn lại và giá")
public record TourDepartureResponse(
        @Schema(requiredMode = REQUIRED) long id,
        @Schema(requiredMode = REQUIRED, description = "Ngày khởi hành (YYYY-MM-DD)") LocalDate departureDate,
        @Schema(requiredMode = REQUIRED, description = "Giá mỗi khách (VND)") long price,
        @Schema(requiredMode = REQUIRED, nullable = true, description = "Giá gốc trước giảm; chỉ có khi đang giảm giá")
        Long originalPrice,
        @Schema(requiredMode = REQUIRED, nullable = true, description = "Phần trăm giảm làm tròn; chỉ có khi đang giảm giá")
        Integer discountPercent,
        @Schema(requiredMode = REQUIRED) int seatsLeft,
        @Schema(requiredMode = REQUIRED, description = "Không còn chỗ nào") boolean isSoldOut,
        @Schema(requiredMode = REQUIRED, description = "Còn chỗ nhưng ≤ 5") boolean isAlmostFull) {
}
