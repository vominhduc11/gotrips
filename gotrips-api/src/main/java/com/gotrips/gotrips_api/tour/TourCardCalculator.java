package com.gotrips.gotrips_api.tour;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

/**
 * Tính các trường suy ra của thẻ tour và của chuyến khởi hành. Hàm thuần (không đụng DB/đồng hồ, nhận {@code today})
 * nên kiểm thử được từng trường hợp biên. Đây là NƠI DUY NHẤT tính các trường này: trước đây web tự tính
 * ({@code toTourCardView}) nay chỉ nhận kết quả từ API.
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
                .filter(d -> isBookable(d, today))
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
            discountPercent = discountPercent(originalPriceFrom, cheapest.getPrice());
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

    /**
     * Khách còn đặt được chuyến này: sau hôm nay (đặt trực tuyến từ ngày mai) và còn chỗ. Điều kiện này cũng nằm ở các
     * query của {@code TourRepository}/{@code TourDepartureRepository} (để cắt sớm ở DB); đây mới là nguồn chính.
     */
    public static boolean isBookable(TourDeparture departure, LocalDate today) {
        return departure.getDepartureDate().isAfter(today) && seatsLeft(departure) > 0;
    }

    /**
     * Một chuyến ở trang chi tiết. Khác {@link #toCard}: không loại chuyến đã đầy (khách vẫn thấy lịch, nhãn "Hết chỗ"),
     * việc bỏ chuyến đã qua do nơi gọi (query) lo.
     */
    public static TourDepartureResponse toDeparture(TourDeparture departure) {
        int seatsLeft = seatsLeft(departure);
        boolean discounted = departure.getOriginalPrice() != null && departure.getOriginalPrice() > departure.getPrice();

        return new TourDepartureResponse(
                departure.getId(),
                departure.getDepartureDate(),
                departure.getPrice(),
                discounted ? departure.getOriginalPrice() : null,
                discounted ? discountPercent(departure.getOriginalPrice(), departure.getPrice()) : null,
                seatsLeft,
                seatsLeft == 0,
                seatsLeft > 0 && seatsLeft <= ALMOST_FULL_THRESHOLD);
    }

    /** Cùng phép tính số thực với web (Math.round của JS và Java đều làm tròn .5 lên) để % khớp từng ký tự. */
    private static int discountPercent(long originalPrice, long price) {
        return (int) Math.round(((double) (originalPrice - price) / originalPrice) * 100);
    }

    private static int seatsLeft(TourDeparture departure) {
        return Math.max(0, departure.getTotalSeats() - departure.getBookedSeats());
    }
}
