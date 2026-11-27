package com.gotrips.gotrips_api.hotel;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;

import com.gotrips.gotrips_api.common.catalog.ImageResponse;

import io.swagger.v3.oas.annotations.media.Schema;

/** Loại phòng ở trang quản trị. Mức tối thiểu khi giảm số phòng và cờ xoá được do API tính. */
public record AdminRoomTypeResponse(
        @Schema(requiredMode = REQUIRED) long id,
        @Schema(requiredMode = REQUIRED) long hotelId,
        @Schema(requiredMode = REQUIRED) String name,
        @Schema(requiredMode = REQUIRED, description = "Giá MỘT phòng MỘT đêm (VND)") long pricePerNight,
        @Schema(requiredMode = REQUIRED, description = "Số khách tối đa MỖI phòng") int maxGuests,
        @Schema(requiredMode = REQUIRED) String bedType,
        @Schema(requiredMode = REQUIRED, description = "Diện tích (m²)") int areaM2,
        @Schema(requiredMode = REQUIRED) int totalRooms,
        @Schema(requiredMode = REQUIRED, description = "Tiện ích trong phòng, theo thứ tự danh mục")
        List<AmenityResponse> amenities,
        @Schema(requiredMode = REQUIRED, description = "Ảnh theo thứ tự hiển thị") List<ImageResponse> images,
        @Schema(requiredMode = REQUIRED, description = "Số phòng bị giữ cao nhất trong một đêm kể từ hôm nay (đơn chưa "
                + "huỷ): không giảm được tổng số phòng xuống thấp hơn")
        int minimumTotalRooms,
        @Schema(requiredMode = REQUIRED, description = "Xoá được: chưa từng có đơn (kể cả đơn huỷ) và khách sạn chưa "
                + "bị xoá")
        boolean deletable) {
}
