package com.gotrips.gotrips_api.testimonial;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;

/** Đánh giá kèm tên tour (khớp {@code TestimonialView} của web). */
@Schema(description = "Đánh giá của khách về một tour")
public record TestimonialResponse(
        @Schema(requiredMode = REQUIRED) long id,
        @Schema(requiredMode = REQUIRED) long tourId,
        @Schema(requiredMode = REQUIRED, example = "Nguyễn Minh Anh") String customerName,
        @Schema(requiredMode = REQUIRED, example = "TP. Hồ Chí Minh") String customerCity,
        @Schema(requiredMode = REQUIRED, description = "Số sao 1–5", example = "5") int rating,
        @Schema(requiredMode = REQUIRED) String content,
        @Schema(requiredMode = REQUIRED, description = "Tên tour được đánh giá") String tourTitle) {
}
