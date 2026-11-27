package com.gotrips.gotrips_api.hotel;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;

import com.gotrips.gotrips_api.common.catalog.ImageResponse;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Loại phòng ở trang chi tiết: các trường của {@link HotelRoomTypeResponse} (liệt kê phẳng) + bộ ảnh và tiện ích. Chỉ
 * {@code GET /hotels/{slug}} trả hình dạng này; kết quả tìm vẫn dùng bản gốc. {@link HotelMapper} dựng đối tượng này từ
 * bản gốc và báo lỗi lúc biên dịch nếu bản gốc có field mà ở đây quên. Chú thích {@code @Schema} của hai record phải
 * giống nhau ({@code CatalogOpenApiTests} canh điều này).
 */
@Schema(description = "Loại phòng ở trang chi tiết: thông tin loại phòng, bộ ảnh và tiện ích")
public record HotelRoomTypeDetailResponse(
        @Schema(requiredMode = REQUIRED) long id,
        @Schema(requiredMode = REQUIRED, example = "Phòng Deluxe") String name,
        @Schema(requiredMode = REQUIRED, description = "Giá MỘT phòng MỘT đêm (VND)") long pricePerNight,
        @Schema(requiredMode = REQUIRED, description = "Số khách tối đa MỖI phòng", example = "2") int maxGuests,
        @Schema(requiredMode = REQUIRED, example = "1 giường đôi lớn") String bedType,
        @Schema(requiredMode = REQUIRED, description = "Diện tích (m²)", example = "28") int areaM2,
        @Schema(requiredMode = REQUIRED, description = "Ảnh của loại phòng theo thứ tự hiển thị; rỗng nếu chưa có ảnh")
        List<ImageResponse> images,
        @Schema(requiredMode = REQUIRED, description = "Tiện ích trong phòng") List<AmenityResponse> amenities) {
}
