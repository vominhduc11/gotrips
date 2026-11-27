package com.gotrips.gotrips_api.destination;

import com.gotrips.gotrips_api.common.catalog.CatalogSlugs;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Tạo hoặc sửa điểm đến. Luật và câu báo lỗi khớp {@code destination-form-schema.ts} của gotrips-admin: đổi một nơi phải
 * đổi nơi kia. URL ảnh được kiểm thêm theo danh sách cho phép ({@code CatalogImageUrls}).
 */
@Schema(description = "Dữ liệu của một điểm đến")
public record AdminDestinationRequest(
        @Schema(example = "da-lat", description = "Tối đa 60 ký tự: bộ lọc điểm đến của website bỏ qua slug dài hơn")
        @NotBlank(message = "Vui lòng nhập slug.")
        @Size(max = AdminDestinationRequest.SLUG_MAX_LENGTH, message = "Slug không được quá 60 ký tự.")
        @Pattern(regexp = CatalogSlugs.PATTERN, message = CatalogSlugs.PATTERN_MESSAGE)
        String slug,

        @Schema(example = "Đà Lạt")
        @NotBlank(message = "Vui lòng nhập tên điểm đến.")
        @Size(max = 150, message = "Tên không được quá 150 ký tự.")
        String name,

        @Schema(example = "Tây Nguyên")
        @NotBlank(message = "Vui lòng nhập vùng.")
        @Size(max = 100, message = "Vùng không được quá 100 ký tự.")
        String region,

        @NotBlank(message = "Vui lòng nhập địa chỉ ảnh.")
        @Size(max = 500, message = "Địa chỉ ảnh không được quá 500 ký tự.")
        String imageUrl,

        @Schema(description = "Mô tả ảnh cho trình đọc màn hình")
        @NotBlank(message = "Vui lòng nhập mô tả ảnh.")
        @Size(max = 255, message = "Mô tả ảnh không được quá 255 ký tự.")
        String imageAlt) {

    /**
     * Web chỉ nhận {@code ?destination=} tối đa 60 ký tự ({@code tour-filters.ts}); slug dài hơn bị bỏ qua âm thầm và
     * trang hiện mọi tour. Cột DB cho phép dài hơn.
     */
    public static final int SLUG_MAX_LENGTH = 60;

    public AdminDestinationRequest {
        slug = strip(slug);
        name = strip(name);
        region = strip(region);
        imageUrl = strip(imageUrl);
        imageAlt = strip(imageAlt);
    }

    private static String strip(String value) {
        return value == null ? null : value.strip();
    }
}
