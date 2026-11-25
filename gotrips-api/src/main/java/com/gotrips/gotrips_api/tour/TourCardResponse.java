package com.gotrips.gotrips_api.tour;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Thẻ tour (khớp {@code TourCardView} của web). Các trường suy ra do API tính sẵn để web không phải tải lịch
 * khởi hành; những trường có thể không có đều khai báo {@code nullable} + bắt buộc có mặt để client sinh ra kiểu
 * {@code T | null} thay vì {@code T?}.
 */
@Schema(description = "Thẻ tour kèm giá từ, ngày khởi hành gần nhất và số chỗ còn lại")
public record TourCardResponse(
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
        @Schema(requiredMode = REQUIRED, description = "Số chỗ còn lại của chuyến gần nhất ≤ 5") boolean isAlmostFull) {
}
