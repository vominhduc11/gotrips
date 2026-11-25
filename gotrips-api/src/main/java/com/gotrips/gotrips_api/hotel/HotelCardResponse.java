package com.gotrips.gotrips_api.hotel;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;

/** Thẻ khách sạn (khớp {@code HotelCardView} của web). */
@Schema(description = "Thẻ khách sạn kèm giá từ một đêm")
public record HotelCardResponse(
        @Schema(requiredMode = REQUIRED) long id,
        @Schema(requiredMode = REQUIRED, example = "khach-san-doi-may-da-lat") String slug,
        @Schema(requiredMode = REQUIRED) String name,
        @Schema(requiredMode = REQUIRED) String destinationName,
        @Schema(requiredMode = REQUIRED, description = "Slug điểm đến, cũng là giá trị ô 'Điểm đến' của form tìm khách sạn")
        String destinationSlug,
        @Schema(requiredMode = REQUIRED, example = "Phường 3, Đà Lạt") String area,
        @Schema(requiredMode = REQUIRED, description = "Hạng sao 1–5", example = "4") int starRating,
        @Schema(requiredMode = REQUIRED) String imageUrl,
        @Schema(requiredMode = REQUIRED) String imageAlt,
        @Schema(requiredMode = REQUIRED, description = "Điểm khách chấm 0–5", example = "4.6") double rating,
        @Schema(requiredMode = REQUIRED) int reviewCount,
        @Schema(requiredMode = REQUIRED, description = "Giá từ: giá một đêm thấp nhất trong các loại phòng (VND)")
        long minPricePerNight) {
}
