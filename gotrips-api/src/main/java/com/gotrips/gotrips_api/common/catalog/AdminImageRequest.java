package com.gotrips.gotrips_api.common.catalog;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Một ảnh nhân viên gửi lên cho bộ ảnh của danh mục. Thứ tự trong mảng là thứ tự hiển thị. URL còn được kiểm theo danh
 * sách cho phép ({@code CatalogImageUrls}). Giới hạn và câu chữ khớp {@code image-schema.ts} của gotrips-admin: đổi một
 * nơi phải đổi nơi kia.
 */
@Schema(description = "Một ảnh gửi lên kèm mô tả thay thế")
public record AdminImageRequest(
        @NotBlank(message = "Vui lòng nhập địa chỉ ảnh.")
        @Size(max = 500, message = "Địa chỉ ảnh không được quá 500 ký tự.")
        String url,

        @Schema(description = "Mô tả ảnh cho trình đọc màn hình")
        @NotBlank(message = "Vui lòng nhập mô tả ảnh.")
        @Size(max = 255, message = "Mô tả ảnh không được quá 255 ký tự.")
        String alt) {

    public AdminImageRequest {
        url = url == null ? null : url.strip();
        alt = alt == null ? null : alt.strip();
    }
}
