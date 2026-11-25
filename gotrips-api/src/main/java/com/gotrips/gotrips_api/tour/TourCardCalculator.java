package com.gotrips.gotrips_api.tour;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

/**
 * Tính các trường suy ra của thẻ tour. Hàm thuần (không đụng DB/đồng hồ, nhận {@code today}) nên kiểm thử
 * được từng trường hợp biên. Chép đúng {@code toTourCardView} (lib/data/tour-view.ts) của gotrips-web: hai nơi
 * phải cho CÙNG kết quả, đổi một nơi phải đổi nơi kia.
 *
 * <ul>
 *   <li>Chuyến đặt được: sau hôm nay (không gồm hôm nay) và còn chỗ.
 *   <li>Giá từ = chuyến đặt được có giá thấp nhất (giá bằng nhau thì chuyến sớm hơn), kèm giá gốc/% giảm
 *       của CHÍNH chuyến đó.
 *   <li>Ngày gần nhất và số chỗ còn lại = của chuyến đặt được sớm nhất.
 * </ul>
 */
public final class TourCardCalculator {

    /** Chỉ còn ≤ ngưỡng này thì hiện nhãn "Sắp hết chỗ" (khớp {@code ALMOST_FULL_THRESHOLD} của web). */
    public static final int ALMOST_FULL_THRESHOLD = 5;

    private TourCardCalculator() {
    }

    /**
     * @param departures mọi chuyến của tour (hoặc đã lọc sơ bộ ở DB); hàm vẫn tự lọc lại theo {@code today}.
     */
    public static TourCardResponse toCard(Tour tour, List<TourDeparture> departures, LocalDate today) {
        // Thứ tự theo ngày rồi id để kết quả không phụ thuộc thứ tự DB trả về.
        List<TourDeparture> bookable = departures.stream()
                .filter(d -> d.getDepartureDate().isAfter(today) && seatsLeft(d) > 0)
                .sorted(Comparator.comparing(TourDeparture::getDepartureDate).thenComparing(TourDeparture::getId))
                .toList();

        TourDeparture nearest = bookable.isEmpty() ? null : bookable.get(0);
        TourDeparture cheapest = null;
        for (TourDeparture departure : bookable) {
            // So sánh nghiêm ngặt "<": giá bằng nhau giữ chuyến sớm hơn (danh sách đã sắp theo ngày).
            if (cheapest == null || departure.getPrice() < cheapest.getPrice()) {
                cheapest = departure;
            }
        }

        Long originalPriceFrom = cheapest != null && cheapest.getOriginalPrice() != null
                && cheapest.getOriginalPrice() > cheapest.getPrice() ? cheapest.getOriginalPrice() : null;
        Integer seatsLeft = nearest == null ? null : seatsLeft(nearest);
        Integer discountPercent = null;
        if (cheapest != null && originalPriceFrom != null) {
            // Cùng phép tính số thực với web (Math.round của JS và Java đều làm tròn .5 lên) để % khớp từng ký tự.
            discountPercent = (int) Math.round(
                    ((double) (originalPriceFrom - cheapest.getPrice()) / originalPriceFrom) * 100);
        }

        return new TourCardResponse(
                tour.getId(),
                tour.getSlug(),
                tour.getTitle(),
                tour.getDestination().getName(),
                tour.getDestination().getSlug(),
                tour.getDurationDays(),
                tour.getDurationNights(),
                tour.getDepartureCity(),
                tour.getCoverImageUrl(),
                tour.getCoverImageAlt(),
                tour.getRating().doubleValue(),
                tour.getReviewCount(),
                nearest == null ? null : nearest.getDepartureDate(),
                seatsLeft,
                cheapest == null ? null : cheapest.getPrice(),
                originalPriceFrom,
                discountPercent,
                seatsLeft != null && seatsLeft <= ALMOST_FULL_THRESHOLD);
    }

    private static int seatsLeft(TourDeparture departure) {
        return Math.max(0, departure.getTotalSeats() - departure.getBookedSeats());
    }
}
