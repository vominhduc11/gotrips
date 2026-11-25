package com.gotrips.gotrips_api.tour;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Đánh giá của khách về chính tour đang xem (khớp {@code Testimonial} của web). Khác {@code TestimonialResponse}
 * (dùng ở Trang chủ, kèm tên tour) ở chỗ không có {@code tourTitle}: trang chi tiết đã có tên tour.
 */
@Schema(description = "Đánh giá của khách về tour")
public record TourTestimonialResponse(
        @Schema(requiredMode = REQUIRED) long id,
        @Schema(requiredMode = REQUIRED) long tourId,
        @Schema(requiredMode = REQUIRED, example = "Nguyễn Minh Anh") String customerName,
        @Schema(requiredMode = REQUIRED, example = "TP. Hồ Chí Minh") String customerCity,
        @Schema(requiredMode = REQUIRED, description = "Số sao 1–5", example = "5") int rating,
        @Schema(requiredMode = REQUIRED) String content) {
}
