package com.gotrips.gotrips_api.hotel;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Một khách sạn trong kết quả tìm (khớp {@code HotelSearchResultView} của web): các trường của
 * {@link HotelCardResponse} + loại phòng rẻ nhất còn đủ chỗ và tổng tiền cả kỳ. Phẳng như
 * {@link HotelDetailResponse}; {@code @Schema} giữ giống thẻ.
 */
@Schema(description = "Khách sạn trong kết quả tìm: thông tin thẻ, phòng rẻ nhất đủ chỗ và tổng tiền cả kỳ")
public record HotelSearchResultResponse(
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
        long minPricePerNight,
        @Schema(requiredMode = REQUIRED, description = "Loại phòng rẻ nhất còn chứa đủ số khách với số phòng đã chọn")
        HotelRoomTypeResponse room,
        @Schema(requiredMode = REQUIRED, description = "Số đêm của kỳ lưu trú") int nights,
        @Schema(requiredMode = REQUIRED, description = "Số phòng đã chọn") int rooms,
        @Schema(requiredMode = REQUIRED, description = "Tổng tiền cả kỳ = giá một phòng một đêm × số đêm × số phòng (VND)")
        long totalPrice) {
}
