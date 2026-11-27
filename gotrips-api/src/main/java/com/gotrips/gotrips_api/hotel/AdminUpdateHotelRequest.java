package com.gotrips.gotrips_api.hotel;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;

import com.gotrips.gotrips_api.common.catalog.AdminImageRequest;
import com.gotrips.gotrips_api.common.catalog.CatalogSlugs;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Sửa nội dung khách sạn. Gửi ĐỦ mọi trường: tiện ích và bộ ảnh được thay toàn bộ. Trạng thái đổi bằng endpoint riêng;
 * điểm và số đánh giá không sửa được.
 */
@Schema(description = "Nội dung sửa được của khách sạn")
public record AdminUpdateHotelRequest(
        @Schema(example = "khach-san-doi-may-da-lat")
        @NotBlank(message = AdminHotelRules.SLUG_REQUIRED)
        @Size(max = AdminHotelRules.SLUG_MAX_LENGTH, message = AdminHotelRules.SLUG_TOO_LONG)
        @Pattern(regexp = CatalogSlugs.PATTERN, message = CatalogSlugs.PATTERN_MESSAGE)
        String slug,

        @NotBlank(message = AdminHotelRules.NAME_REQUIRED)
        @Size(max = AdminHotelRules.NAME_MAX_LENGTH, message = AdminHotelRules.NAME_TOO_LONG)
        String name,

        @NotNull(message = AdminHotelRules.DESTINATION_REQUIRED)
        Long destinationId,

        @Schema(description = "Hạng sao 1–5", example = "4")
        @NotNull(message = AdminHotelRules.STARS_REQUIRED)
        @Min(value = 1, message = AdminHotelRules.STARS_RANGE)
        @Max(value = 5, message = AdminHotelRules.STARS_RANGE)
        Integer starRating,

        @Schema(example = "Phường 3, Đà Lạt")
        @NotBlank(message = AdminHotelRules.AREA_REQUIRED)
        @Size(max = AdminHotelRules.AREA_MAX_LENGTH, message = AdminHotelRules.AREA_TOO_LONG)
        String area,

        @Schema(description = "Ảnh đại diện (thẻ, tìm kiếm, đơn đặt phòng)")
        @NotBlank(message = AdminHotelRules.IMAGE_URL_REQUIRED)
        @Size(max = AdminHotelRules.IMAGE_URL_MAX_LENGTH, message = AdminHotelRules.IMAGE_URL_TOO_LONG)
        String imageUrl,

        @NotBlank(message = AdminHotelRules.IMAGE_ALT_REQUIRED)
        @Size(max = AdminHotelRules.IMAGE_ALT_MAX_LENGTH, message = AdminHotelRules.IMAGE_ALT_TOO_LONG)
        String imageAlt,

        @NotBlank(message = AdminHotelRules.DESCRIPTION_REQUIRED)
        @Size(max = AdminHotelRules.DESCRIPTION_MAX_LENGTH, message = AdminHotelRules.DESCRIPTION_TOO_LONG)
        String description,

        @Schema(requiredMode = REQUIRED,
                description = "Mã tiện ích trong danh mục, scope HOTEL hoặc BOTH; mã trùng được bỏ; tối đa 30")
        @NotNull(message = AdminHotelRules.AMENITIES_REQUIRED)
        List<@NotBlank(message = AdminHotelRules.AMENITY_BLANK) String> amenityCodes,

        @Schema(requiredMode = REQUIRED, description = "Ảnh xem thêm theo thứ tự hiển thị, KHÔNG gồm ảnh đại diện")
        @NotNull(message = AdminHotelRules.IMAGES_REQUIRED)
        @Size(max = AdminHotelRules.MAX_GALLERY_IMAGES, message = AdminHotelRules.TOO_MANY_IMAGES)
        List<@NotNull(message = AdminHotelRules.IMAGE_MISSING) @Valid AdminImageRequest> images,

        @Schema(example = "14:00")
        @NotBlank(message = AdminHotelRules.CHECK_IN_REQUIRED)
        @Pattern(regexp = AdminHotelRules.TIME_PATTERN, message = AdminHotelRules.TIME_FORMAT)
        String checkInTime,

        @Schema(example = "12:00")
        @NotBlank(message = AdminHotelRules.CHECK_OUT_REQUIRED)
        @Pattern(regexp = AdminHotelRules.TIME_PATTERN, message = AdminHotelRules.TIME_FORMAT)
        String checkOutTime) implements AdminHotelFields {

    public AdminUpdateHotelRequest {
        slug = AdminHotelRules.strip(slug);
        name = AdminHotelRules.strip(name);
        area = AdminHotelRules.strip(area);
        imageUrl = AdminHotelRules.strip(imageUrl);
        imageAlt = AdminHotelRules.strip(imageAlt);
        description = AdminHotelRules.strip(description);
        checkInTime = AdminHotelRules.strip(checkInTime);
        checkOutTime = AdminHotelRules.strip(checkOutTime);
    }
}
