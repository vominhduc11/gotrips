package com.gotrips.gotrips_api.tour;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;

/** Một chuyến khởi hành ở trang quản trị. */
public record AdminDepartureResponse(
        @Schema(requiredMode = REQUIRED) long id,
        @Schema(requiredMode = REQUIRED) long tourId,
        @Schema(requiredMode = REQUIRED) LocalDate departureDate,
        @Schema(requiredMode = REQUIRED, description = "Giá mỗi khách, VND") long price,
        @Schema(requiredMode = REQUIRED, nullable = true) Long originalPrice,
        @Schema(requiredMode = REQUIRED, nullable = true) Integer discountPercent,
        @Schema(requiredMode = REQUIRED) int totalSeats,
        @Schema(requiredMode = REQUIRED) int bookedSeats,
        @Schema(requiredMode = REQUIRED, description = "Tổng chỗ trừ chỗ đã đặt (kể cả khi đã đóng bán)")
        int remainingSeats,
        @Schema(requiredMode = REQUIRED) AdminDepartureState state,
        @Schema(requiredMode = REQUIRED, description = "Sửa giá, tổng chỗ, đóng/mở bán được")
        boolean editable,
        @Schema(requiredMode = REQUIRED, description = "Đổi ngày được: chưa từng có khách đặt")
        boolean dateEditable,
        @Schema(requiredMode = REQUIRED, description = "Xoá được: chưa từng có khách đặt")
        boolean deletable) {
}
