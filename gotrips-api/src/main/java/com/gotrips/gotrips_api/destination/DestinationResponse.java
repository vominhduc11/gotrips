package com.gotrips.gotrips_api.destination;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;

/** Thẻ điểm đến ở Trang chủ, /destinations và các ô chọn điểm đến (khớp {@code DestinationCardView} của web). */
@Schema(description = "Điểm đến kèm số tour đang mở bán")
public record DestinationResponse(
        @Schema(requiredMode = REQUIRED, example = "1") long id,
        @Schema(requiredMode = REQUIRED, example = "da-lat") String slug,
        @Schema(requiredMode = REQUIRED, example = "Đà Lạt") String name,
        @Schema(requiredMode = REQUIRED, example = "Tây Nguyên") String region,
        @Schema(requiredMode = REQUIRED) String imageUrl,
        @Schema(requiredMode = REQUIRED) String imageAlt,
        @Schema(requiredMode = REQUIRED, description = "Số tour ACTIVE thuộc điểm đến (tour HIDDEN không được đếm)",
                example = "2") long tourCount) {
}
