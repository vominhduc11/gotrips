package com.gotrips.gotrips_api.tour;

import java.text.Normalizer;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;

/**
 * Lọc → sắp xếp → phân trang danh sách tour. Hàm thuần (không đụng DB/đồng hồ, nhận {@code today}) nên kiểm thử được
 * từng trường hợp biên. Đây là nơi duy nhất giữ luật tìm tour (trước đây nằm ở web: {@code searchTourList}).
 *
 * <ul>
 *   <li>Chỉ nhận tour mà nơi gọi đã chọn (ACTIVE, đúng điểm đến); hàm không tự lọc trạng thái.
 *   <li>Lọc {@code date}/{@code guests} chọn các CHUYẾN còn đặt được thoả điều kiện; thẻ tour hiển thị giá/ngày của
 *       đúng các chuyến đó, và tour không có chuyến nào thoả thì bị loại.
 *   <li>Khi không lọc ngày/khách, tour hết chỗ vẫn hiện (thẻ không có giá) và xếp cuối, để số tour khớp với số đếm ở
 *       thẻ "Điểm đến phổ biến".
 *   <li>{@code q} so khớp không phân biệt dấu/hoa thường trên "tên tour + tên điểm đến".
 * </ul>
 *
 * Toàn bộ danh sách được lọc/sắp trong bộ nhớ: đủ cho catalog cỡ MVP (vài chục tour). Khi catalog lớn thì phải đẩy
 * lọc/sắp/phân trang xuống SQL (giá từ và ngày gần nhất là giá trị gom theo chuyến nên cần truy vấn riêng).
 */
public final class TourSearchCalculator {

    /** Số tour mỗi trang. Cố định ở API (không phải tham số) để mọi client phân trang giống nhau. */
    public static final int PAGE_SIZE = 8;

    private TourSearchCalculator() {
    }

    /**
     * @param query  chữ tìm kiếm (có thể null/trống = không lọc)
     * @param date   chỉ giữ chuyến khởi hành đúng ngày này (null = không lọc)
     * @param guests chỉ giữ chuyến còn đủ chừng này chỗ (null = không lọc)
     * @param page   trang yêu cầu, ≥ 1; trang vượt quá số trang được kẹp về trang cuối
     */
    public record Criteria(String query, LocalDate date, Integer guests, TourSort sort, int page) {
    }

    public record Result(List<TourCardResponse> items, int total, int page, int pageCount) {
    }

    private record Entry(Tour tour, TourCardResponse card) {
    }

    /**
     * @param bookableDeparturesByTour chuyến đặt được (sau {@code today}, còn chỗ) của từng tour theo id tour; tour
     *                                 không có khoá nghĩa là không còn chuyến nào
     */
    public static Result search(List<Tour> tours, Map<Long, List<TourDeparture>> bookableDeparturesByTour,
            Criteria criteria, LocalDate today) {
        String query = criteria.query() == null ? "" : normalize(criteria.query());
        boolean hasDepartureFilter = criteria.date() != null || criteria.guests() != null;

        List<Entry> entries = new ArrayList<>();
        for (Tour tour : tours) {
            if (!query.isEmpty() && !normalize(tour.getTitle() + " " + tour.getDestination().getName()).contains(query)) {
                continue;
            }

            List<TourDeparture> departures = bookableDeparturesByTour.getOrDefault(tour.getId(), List.of());
            if (hasDepartureFilter) {
                departures = departures.stream()
                        .filter(d -> TourCardCalculator.isBookable(d, today))
                        .filter(d -> criteria.date() == null || d.getDepartureDate().equals(criteria.date()))
                        .filter(d -> criteria.guests() == null || seatsLeft(d) >= criteria.guests())
                        .toList();
                if (departures.isEmpty()) {
                    continue;
                }
            }

            entries.add(new Entry(tour, TourCardCalculator.toCard(tour, departures, today)));
        }

        entries.sort(comparator(criteria.sort()));

        int total = entries.size();
        int pageCount = Math.max(1, (total + PAGE_SIZE - 1) / PAGE_SIZE);
        // Kẹp trước khi nhân: page do client gửi nên có thể rất lớn, nhân thẳng sẽ tràn int.
        int page = Math.min(Math.max(1, criteria.page()), pageCount);
        int from = (page - 1) * PAGE_SIZE;
        int to = Math.min(from + PAGE_SIZE, total);

        return new Result(entries.subList(from, to).stream().map(Entry::card).toList(), total, page, pageCount);
    }

    /**
     * Tour không còn chuyến nào (không có giá) luôn xếp cuối bất kể kiểu sắp xếp; hoà thì theo id để thứ tự ổn định
     * giữa các lần gọi (trang 1 và trang 2 không bao giờ trùng hay sót tour).
     */
    private static Comparator<Entry> comparator(TourSort sort) {
        Comparator<Entry> bySort = switch (sort) {
            case PRICE_ASC -> byCardField(TourCardResponse::priceFrom);
            case PRICE_DESC -> byCardField(TourCardResponse::priceFrom).reversed();
            case NEAREST_DEPARTURE -> byCardField(TourCardResponse::nextDepartureDate);
            case RATING -> byRating();
            case FEATURED -> Comparator.comparing((Entry e) -> e.tour().isFeatured()).reversed().thenComparing(byRating());
        };
        return Comparator.<Entry, Boolean>comparing(e -> e.card().priceFrom() == null)
                .thenComparing(bySort)
                .thenComparing(e -> e.tour().getId());
    }

    /**
     * So sánh theo một trường của thẻ có thể null (giá, ngày). {@code nullsFirst} chỉ để an toàn: hai tour mà một bên
     * có giá, một bên không đã được phân thứ tự ở bước "không có giá xuống cuối", nên null chỉ gặp nhau khi cả hai
     * cùng null (so bằng nhau, rồi hoà theo id).
     */
    private static <T extends Comparable<? super T>> Comparator<Entry> byCardField(
            Function<TourCardResponse, T> field) {
        return Comparator.comparing(e -> field.apply(e.card()), Comparator.nullsFirst(Comparator.<T>naturalOrder()));
    }

    private static Comparator<Entry> byRating() {
        return Comparator.comparingDouble((Entry e) -> e.card().rating()).reversed()
                .thenComparing(Comparator.comparingInt((Entry e) -> e.card().reviewCount()).reversed());
    }

    private static int seatsLeft(TourDeparture departure) {
        return Math.max(0, departure.getTotalSeats() - departure.getBookedSeats());
    }

    /**
     * Chuẩn hoá để so khớp: bỏ dấu, bỏ phân biệt hoa/thường, gộp khoảng trắng và gạch nối. "Đà  Lạt" / "da lat" /
     * "da-lat" → "da lat". Chép {@code normalizeSearchText} của web (lib/format.ts), kể cả {@code đ → d} vì chữ đ không
     * tách dấu được bằng NFD.
     */
    static String normalize(String value) {
        return Normalizer.normalize(value.toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .replace('đ', 'd')
                .replaceAll("[-_\\s]+", " ")
                .trim();
    }
}
