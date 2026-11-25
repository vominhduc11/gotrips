package com.gotrips.gotrips_api.tour;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.LocalDate;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Trang chi tiết tour (khớp {@code TourDetailView} của web): các trường của {@link TourCardResponse} + mô tả, lịch
 * khởi hành và đánh giá. Các trường của thẻ được liệt kê lại (phẳng) thay vì lồng để client dùng như một tài nguyên
 * duy nhất; {@link TourMapper} dựng đối tượng này từ thẻ nên thêm/đổi trường ở thẻ mà quên ở đây thì lỗi lúc biên dịch.
 * Chú thích {@code @Schema} phải giữ giống thẻ ({@code CatalogOpenApiTests} canh điều này).
 */
@Schema(description = "Chi tiết tour: thông tin thẻ tour, mô tả, lịch khởi hành và đánh giá")
public record TourDetailResponse(
        @Schema(requiredMode = REQUIRED) long id,
        @Schema(requiredMode = REQUIRED, example = "da-lat-3n2d-thanh-pho-ngan-hoa") String slug,
        @Schema(requiredMode = REQUIRED) String title,
        @Schema(requiredMode = REQUIRED) String destinationName,
        @Schema(requiredMode = REQUIRED) String destinationSlug,
        @Schema(requiredMode = REQUIRED) int durationDays,
        @Schema(requiredMode = REQUIRED) int durationNights,
        @Schema(requiredMode = REQUIRED, example = "TP. Hồ Chí Minh") String departureCity,
        @Schema(requiredMode = REQUIRED) String coverImage,
        @Schema(requiredMode = REQUIRED) String coverImageAlt,
        @Schema(requiredMode = REQUIRED, description = "Điểm trung bình 0–5", example = "4.8") double rating,
        @Schema(requiredMode = REQUIRED) int reviewCount,
        @Schema(requiredMode = REQUIRED, nullable = true,
                description = "Ngày khởi hành còn chỗ gần nhất (YYYY-MM-DD); null nếu không còn chuyến nào")
        LocalDate nextDepartureDate,
        @Schema(requiredMode = REQUIRED, nullable = true,
                description = "Số chỗ còn lại của chuyến gần nhất; null nếu không còn chuyến nào")
        Integer seatsLeft,
        @Schema(requiredMode = REQUIRED, nullable = true,
                description = "Giá từ: giá thấp nhất trong các chuyến còn chỗ ở tương lai (VND); null nếu không có chuyến")
        Long priceFrom,
        @Schema(requiredMode = REQUIRED, nullable = true,
                description = "Giá gốc của chính chuyến cho 'giá từ'; chỉ có khi đang giảm giá")
        Long originalPriceFrom,
        @Schema(requiredMode = REQUIRED, nullable = true, description = "Phần trăm giảm làm tròn; chỉ có khi đang giảm giá")
        Integer discountPercent,
        @Schema(requiredMode = REQUIRED, description = "Số chỗ còn lại của chuyến gần nhất ≤ 5") boolean isAlmostFull,
        @Schema(requiredMode = REQUIRED) String shortDescription,
        @Schema(requiredMode = REQUIRED, description = "Các chuyến ở tương lai (kể cả đã đầy), theo ngày tăng dần")
        List<TourDepartureResponse> departures,
        @Schema(requiredMode = REQUIRED, description = "Đánh giá của chính tour, theo id")
        List<TourTestimonialResponse> testimonials) {
}
