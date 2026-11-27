package com.gotrips.gotrips_api.common.catalog;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;

/** Một ảnh trong bộ ảnh của danh mục. Nằm ở package dùng chung vì ảnh tour sau này dùng cùng hình dạng. */
@Schema(description = "Một ảnh kèm mô tả thay thế")
public record ImageResponse(
        @Schema(requiredMode = REQUIRED) String url,
        @Schema(requiredMode = REQUIRED, description = "Mô tả nội dung ảnh (thuộc tính alt)") String alt) {
}
