package com.gotrips.gotrips_api.hotel;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;

import com.gotrips.gotrips_api.common.catalog.AdminImageRequest;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Tạo hoặc sửa loại phòng. Gửi ĐỦ mọi trường: tiện ích và bộ ảnh được thay toàn bộ. Khách sạn của loại phòng không đổi
 * được nên không có trong request.
 */
@Schema(description = "Dữ liệu của một loại phòng")
public record AdminRoomTypeRequest(
        @Schema(example = "Phòng Deluxe")
        @NotBlank(message = AdminHotelRules.ROOM_NAME_REQUIRED)
        @Size(max = AdminHotelRules.ROOM_NAME_MAX_LENGTH, message = AdminHotelRules.ROOM_NAME_TOO_LONG)
        String name,

        @Schema(description = "Giá MỘT phòng MỘT đêm (VND). Đổi giá không ảnh hưởng đơn đã đặt")
        @NotNull(message = AdminHotelRules.PRICE_REQUIRED)
        @Min(value = 1, message = AdminHotelRules.PRICE_RANGE)
        @Max(value = AdminHotelRules.MAX_PRICE, message = AdminHotelRules.PRICE_RANGE)
        Long pricePerNight,

        @Schema(description = "Số khách tối đa MỖI phòng")
        @NotNull(message = AdminHotelRules.MAX_GUESTS_REQUIRED)
        @Min(value = 1, message = AdminHotelRules.MAX_GUESTS_RANGE)
        @Max(value = HotelStayCalculator.MAX_GUESTS, message = AdminHotelRules.MAX_GUESTS_RANGE)
        Integer maxGuests,

        @Schema(example = "1 giường đôi lớn")
        @NotBlank(message = AdminHotelRules.BED_TYPE_REQUIRED)
        @Size(max = AdminHotelRules.BED_TYPE_MAX_LENGTH, message = AdminHotelRules.BED_TYPE_TOO_LONG)
        String bedType,

        @Schema(description = "Diện tích (m²)")
        @NotNull(message = AdminHotelRules.ROOM_AREA_REQUIRED)
        @Min(value = 1, message = AdminHotelRules.ROOM_AREA_RANGE)
        @Max(value = AdminHotelRules.MAX_ROOM_AREA, message = AdminHotelRules.ROOM_AREA_RANGE)
        Integer areaM2,

        @Schema(description = "Tổng số phòng; 0 = ngừng nhận đặt. Không giảm được xuống dưới số phòng đang được giữ ở "
                + "bất kỳ đêm nào từ hôm nay")
        @NotNull(message = AdminHotelRules.TOTAL_ROOMS_REQUIRED)
        @Min(value = 0, message = AdminHotelRules.TOTAL_ROOMS_RANGE)
        @Max(value = AdminHotelRules.MAX_TOTAL_ROOMS, message = AdminHotelRules.TOTAL_ROOMS_RANGE)
        Integer totalRooms,

        @Schema(requiredMode = REQUIRED,
                description = "Mã tiện ích trong danh mục, scope ROOM hoặc BOTH; mã trùng được bỏ; tối đa 30")
        @NotNull(message = AdminHotelRules.AMENITIES_REQUIRED)
        List<@NotBlank(message = AdminHotelRules.AMENITY_BLANK) String> amenityCodes,

        @Schema(requiredMode = REQUIRED, description = "Ảnh của loại phòng theo thứ tự hiển thị")
        @NotNull(message = AdminHotelRules.IMAGES_REQUIRED)
        @Size(max = AdminHotelRules.MAX_GALLERY_IMAGES, message = AdminHotelRules.TOO_MANY_IMAGES)
        List<@NotNull(message = AdminHotelRules.IMAGE_MISSING) @Valid AdminImageRequest> images) {

    public AdminRoomTypeRequest {
        name = AdminHotelRules.strip(name);
        bedType = AdminHotelRules.strip(bedType);
    }
}
