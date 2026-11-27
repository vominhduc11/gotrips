package com.gotrips.gotrips_api.hotel;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;

import com.gotrips.gotrips_api.common.catalog.CatalogStatus;
import com.gotrips.gotrips_api.common.catalog.ImageResponse;

import io.swagger.v3.oas.annotations.media.Schema;

/** Mọi trường sửa được của một khách sạn, kèm phần chỉ đọc. */
public record AdminHotelDetailResponse(
        @Schema(requiredMode = REQUIRED) long id,
        @Schema(requiredMode = REQUIRED) String slug,
        @Schema(requiredMode = REQUIRED) String name,
        @Schema(requiredMode = REQUIRED) long destinationId,
        @Schema(requiredMode = REQUIRED) String destinationName,
        @Schema(requiredMode = REQUIRED, description = "Hạng sao 1–5") int starRating,
        @Schema(requiredMode = REQUIRED) String area,
        @Schema(requiredMode = REQUIRED) String imageUrl,
        @Schema(requiredMode = REQUIRED) String imageAlt,
        @Schema(requiredMode = REQUIRED) String description,
        @Schema(requiredMode = REQUIRED, description = "Tiện ích của khách sạn, theo thứ tự danh mục")
        List<AmenityResponse> amenities,
        @Schema(requiredMode = REQUIRED, description = "Ảnh xem thêm theo thứ tự hiển thị, không gồm ảnh đại diện")
        List<ImageResponse> images,
        @Schema(requiredMode = REQUIRED, description = "Giờ nhận phòng (HH:mm)", example = "14:00") String checkInTime,
        @Schema(requiredMode = REQUIRED, description = "Giờ trả phòng (HH:mm)", example = "12:00") String checkOutTime,
        @Schema(requiredMode = REQUIRED) CatalogStatus status,
        @Schema(requiredMode = REQUIRED, description = "Điểm khách chấm 0–5 (chỉ đọc)") double rating,
        @Schema(requiredMode = REQUIRED, description = "Số đánh giá (chỉ đọc)") int reviewCount,
        @Schema(requiredMode = REQUIRED) long roomTypeCount,
        @Schema(requiredMode = REQUIRED) long sellingRoomTypeCount,
        @Schema(requiredMode = REQUIRED, nullable = true,
                description = "Giá một đêm thấp nhất trong mọi loại phòng (VND); null khi chưa có loại phòng")
        Long minPricePerNight,
        @Schema(requiredMode = REQUIRED, description = "Đang hiện trên website: ACTIVE và có ít nhất một loại phòng")
        boolean visibleOnWebsite) {
}
