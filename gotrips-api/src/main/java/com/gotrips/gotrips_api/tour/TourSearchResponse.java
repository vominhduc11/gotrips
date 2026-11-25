package com.gotrips.gotrips_api.tour;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

/** Một trang kết quả tìm tour (khớp {@code TourSearchResult} của web). */
@Schema(description = "Một trang kết quả tìm tour")
public record TourSearchResponse(
        @Schema(requiredMode = REQUIRED, description = "Tour của trang này (tối đa "
                + TourSearchCalculator.PAGE_SIZE + ")") List<TourCardResponse> items,
        @Schema(requiredMode = REQUIRED, description = "Tổng số tour khớp bộ lọc, trước khi phân trang") int total,
        @Schema(requiredMode = REQUIRED, description = "Trang thực tế sau khi kẹp vào [1, pageCount]") int page,
        @Schema(requiredMode = REQUIRED, description = "Tổng số trang, tối thiểu 1 (kể cả khi không có kết quả)")
        int pageCount,
        @Schema(requiredMode = REQUIRED, nullable = true, example = "Đà Lạt",
                description = "Tên điểm đến đang lọc (để đặt tiêu đề trang); null nếu không lọc hoặc slug không tồn tại")
        String destinationName) {
}
