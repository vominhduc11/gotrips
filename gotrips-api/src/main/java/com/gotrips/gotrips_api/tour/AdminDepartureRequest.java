package com.gotrips.gotrips_api.tour;

import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Tạo hoặc sửa chuyến. Luật cần "hôm nay" hoặc so hai trường được kiểm ở service. Câu báo lỗi khớp
 * {@code departure-form-schema.ts} của gotrips-admin: đổi một nơi phải đổi nơi kia.
 */
@Schema(description = "Ngày, giá và số chỗ của một chuyến khởi hành")
public record AdminDepartureRequest(
        @Schema(description = "Phải sau hôm nay (giờ Việt Nam)")
        @NotNull(message = "Vui lòng chọn ngày khởi hành.")
        LocalDate departureDate,

        @Schema(description = "Giá mỗi khách, VND")
        @NotNull(message = "Vui lòng nhập giá.")
        @Min(value = 1, message = "Giá phải lớn hơn 0.")
        @Max(value = AdminDepartureRules.MAX_PRICE, message = "Giá quá lớn.")
        Long price,

        @Schema(description = "Giá gốc trước giảm; bỏ trống nếu không giảm, nếu có thì lớn hơn giá")
        @Min(value = 1, message = "Giá gốc phải lớn hơn 0.")
        @Max(value = AdminDepartureRules.MAX_PRICE, message = "Giá gốc quá lớn.")
        Long originalPrice,

        @NotNull(message = "Vui lòng nhập tổng số chỗ.")
        @Min(value = 1, message = "Tổng số chỗ phải từ 1 trở lên.")
        @Max(value = AdminDepartureRules.MAX_SEATS, message = "Tổng số chỗ không được quá 10.000.")
        Integer totalSeats) {
}
