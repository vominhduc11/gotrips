package com.gotrips.gotrips_api.hotel;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Kết quả tìm khách sạn. {@code destinationName} là {@code String} nullable (không phải object) vì springdoc sinh
 * schema sai cho thuộc tính object nullable.
 */
@Schema(description = "Kết quả tìm khách sạn theo điểm đến và khoảng ngày")
public record HotelSearchResponse(
        @Schema(requiredMode = REQUIRED, nullable = true,
                description = "Tên điểm đến của slug đã tìm; null nếu slug không tồn tại (khi đó items rỗng)")
        String destinationName,
        @Schema(requiredMode = REQUIRED,
                description = "Khách sạn còn phòng, sắp theo tổng tiền tăng dần (rồi điểm đánh giá giảm dần, rồi id)")
        List<HotelSearchResultResponse> items) {
}
