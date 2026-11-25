package com.gotrips.gotrips_api.hotel;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Trang chi tiết khách sạn (khớp {@code HotelDetailView} của web): các trường của {@link HotelCardResponse} + giới
 * thiệu, tiện ích, giờ nhận/trả phòng và các loại phòng. Các trường của thẻ được liệt kê lại (phẳng) thay vì lồng để
 * client dùng như một tài nguyên duy nhất; {@link HotelMapper} dựng đối tượng này từ thẻ. Chú thích {@code @Schema}
 * phải giữ giống thẻ ({@code CatalogOpenApiTests} canh điều này).
 */
@Schema(description = "Chi tiết khách sạn: thông tin thẻ, giới thiệu, tiện ích, giờ nhận/trả phòng và các loại phòng")
public record HotelDetailResponse(
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
        @Schema(requiredMode = REQUIRED) String description,
        @Schema(requiredMode = REQUIRED, description = "Tiện ích của khách sạn") List<String> amenities,
        @Schema(requiredMode = REQUIRED, description = "Giờ nhận phòng (HH:mm, giờ địa phương)", example = "14:00",
                pattern = "^\\d{2}:\\d{2}$")
        String checkInTime,
        @Schema(requiredMode = REQUIRED, description = "Giờ trả phòng (HH:mm, giờ địa phương)", example = "12:00",
                pattern = "^\\d{2}:\\d{2}$")
        String checkOutTime,
        @Schema(requiredMode = REQUIRED, description = "Các loại phòng, sắp theo giá một đêm tăng dần")
        List<HotelRoomTypeResponse> roomTypes) {
}
