package com.gotrips.gotrips_api.tour;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import com.gotrips.gotrips_api.common.catalog.CatalogStatus;
import com.gotrips.gotrips_api.destination.Destination;
import com.gotrips.gotrips_api.tour.TourSearchCalculator.Criteria;
import com.gotrips.gotrips_api.tour.TourSearchCalculator.Result;

/** Lọc, sắp xếp và phân trang danh sách tour (hàm thuần, không cần DB). "Hôm nay" cố định là 25/11/2026. */
class TourSearchCalculatorTests {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 25);

    private static final Destination DA_LAT = destination(1, "da-lat", "Đà Lạt");
    private static final Destination PHU_QUOC = destination(2, "phu-quoc", "Phú Quốc");

    private final List<Tour> tours = new ArrayList<>();
    private final Map<Long, List<TourDeparture>> departures = new HashMap<>();
    private long nextDepartureId = 1;

    private static Destination destination(long id, String slug, String name) {
        return Destination.builder().id(id).slug(slug).name(name).region("Vùng").imageUrl("u").imageAlt("a").build();
    }

    /** Thêm một tour; chuyến của nó thêm bằng {@link #departure}. */
    private Tour tour(long id, String title, Destination destination, boolean featured, String rating, int reviews) {
        Tour tour = Tour.builder().id(id).slug("tour-" + id).title(title).destination(destination)
                .durationDays(3).durationNights(2).departureCity("TP. Hồ Chí Minh").shortDescription("Mô tả")
                .coverImageUrl("cover").coverImageAlt("alt").rating(new BigDecimal(rating)).reviewCount(reviews)
                .featured(featured).status(CatalogStatus.ACTIVE).build();
        tours.add(tour);
        return tour;
    }

    private void departure(Tour tour, String date, long price, int totalSeats, int bookedSeats) {
        departures.computeIfAbsent(tour.getId(), k -> new ArrayList<>()).add(TourDeparture.builder()
                .id(nextDepartureId++).tourId(tour.getId()).departureDate(LocalDate.parse(date)).price(price)
                .totalSeats(totalSeats).bookedSeats(bookedSeats).build());
    }

    private Result search(Criteria criteria) {
        return TourSearchCalculator.search(tours, departures, criteria, TODAY);
    }

    private static Criteria sorted(TourSort sort) {
        return new Criteria(null, null, null, sort, 1);
    }

    private static List<Long> ids(Result result) {
        return result.items().stream().map(TourCardResponse::id).toList();
    }

    // --- lọc ---

    @Test
    void withoutFiltersEveryTourIsListedAndTheOneWithoutDeparturesGoesLast() {
        Tour soldOut = tour(1, "Hết chỗ", DA_LAT, true, "5.0", 500);
        departure(soldOut, "2027-01-10", 100, 20, 20);
        Tour open = tour(2, "Còn chỗ", DA_LAT, false, "3.0", 1);
        departure(open, "2027-01-10", 900, 20, 0);

        Result result = search(sorted(TourSort.FEATURED));

        // Tour hết chỗ vẫn hiện (khớp số đếm ở "Điểm đến phổ biến") nhưng xếp cuối dù nổi bật và điểm cao hơn.
        assertThat(ids(result)).containsExactly(2L, 1L);
        assertThat(result.items().get(1).priceFrom()).isNull();
        assertThat(result.total()).isEqualTo(2);
    }

    @Test
    void queryIgnoresAccentsAndCaseAndSearchesTitleAndDestinationName() {
        Tour inDaLat = tour(1, "Hành trình ngàn hoa", DA_LAT, false, "4.0", 1);
        Tour inPhuQuoc = tour(2, "Đảo Ngọc Xanh", PHU_QUOC, false, "4.0", 1);

        assertThat(ids(search(new Criteria("da lat", null, null, TourSort.FEATURED, 1)))).containsExactly(inDaLat.getId());
        assertThat(ids(search(new Criteria("ĐÀ-LẠT", null, null, TourSort.FEATURED, 1)))).containsExactly(inDaLat.getId());
        assertThat(ids(search(new Criteria("ngan hoa", null, null, TourSort.FEATURED, 1)))).containsExactly(inDaLat.getId());
        // Chữ đ không tách dấu được bằng NFD nên phải đổi riêng: "dao" khớp "Đảo".
        assertThat(ids(search(new Criteria("dao ngoc", null, null, TourSort.FEATURED, 1)))).containsExactly(inPhuQuoc.getId());
        assertThat(search(new Criteria("khong co", null, null, TourSort.FEATURED, 1)).total()).isZero();
    }

    @Test
    void blankQueryDoesNotFilter() {
        tour(1, "A", DA_LAT, false, "4.0", 1);
        tour(2, "B", DA_LAT, false, "4.0", 1);

        assertThat(search(new Criteria("   ", null, null, TourSort.FEATURED, 1)).total()).isEqualTo(2);
    }

    @Test
    void dateKeepsOnlyToursDepartingThatDayAndTheCardShowsThoseDepartures() {
        Tour match = tour(1, "Có đúng ngày", DA_LAT, false, "4.0", 1);
        departure(match, "2027-01-10", 500, 20, 0); // rẻ hơn nhưng không đúng ngày
        departure(match, "2027-02-20", 900, 20, 0);
        Tour other = tour(2, "Ngày khác", DA_LAT, false, "4.0", 1);
        departure(other, "2027-01-10", 100, 20, 0);

        Result result = search(new Criteria(null, LocalDate.parse("2027-02-20"), null, TourSort.FEATURED, 1));

        assertThat(ids(result)).containsExactly(1L);
        // Giá/ngày của thẻ là của chuyến đúng ngày, không phải chuyến rẻ nhất của tour.
        assertThat(result.items().get(0).priceFrom()).isEqualTo(900L);
        assertThat(result.items().get(0).nextDepartureDate()).isEqualTo(LocalDate.parse("2027-02-20"));
    }

    @Test
    void dateFilterNeverMatchesADepartureThatCannotBeBooked() {
        Tour tour = tour(1, "A", DA_LAT, false, "4.0", 1);
        departure(tour, "2027-01-10", 100, 20, 20); // đúng ngày nhưng đã đầy
        departure(tour, "2026-11-25", 100, 20, 0); // hôm nay: đã đóng đặt trực tuyến
        departure(tour, "2026-11-20", 100, 20, 0); // đã qua

        // Không có tour nào "khớp ngày" mà thẻ lại không có giá: phải bị loại hẳn.
        assertThat(search(new Criteria(null, LocalDate.parse("2027-01-10"), null, TourSort.FEATURED, 1)).total()).isZero();
        assertThat(search(new Criteria(null, LocalDate.parse("2026-11-25"), null, TourSort.FEATURED, 1)).total()).isZero();
        assertThat(search(new Criteria(null, LocalDate.parse("2026-11-20"), null, TourSort.FEATURED, 1)).total()).isZero();
    }

    @Test
    void guestsNeedsADepartureWithEnoughSeats() {
        Tour tour = tour(1, "Còn 3 chỗ", DA_LAT, false, "4.0", 1);
        departure(tour, "2027-01-10", 100, 20, 17); // còn 3 chỗ
        departure(tour, "2027-02-10", 300, 20, 0); // còn 20 chỗ

        assertThat(ids(search(new Criteria(null, null, 3, TourSort.FEATURED, 1)))).containsExactly(1L);
        Result four = search(new Criteria(null, null, 4, TourSort.FEATURED, 1));
        // Cần 4 chỗ: chuyến còn 3 chỗ bị bỏ nên "giá từ" phải là của chuyến còn đủ chỗ.
        assertThat(four.items().get(0).priceFrom()).isEqualTo(300L);
        assertThat(search(new Criteria(null, null, 21, TourSort.FEATURED, 1)).total()).isZero();
    }

    @Test
    void dateAndGuestsMustHoldOnTheSameDeparture() {
        Tour tour = tour(1, "A", DA_LAT, false, "4.0", 1);
        departure(tour, "2027-01-10", 100, 20, 19); // đúng ngày nhưng còn 1 chỗ
        departure(tour, "2027-02-10", 100, 20, 0); // đủ chỗ nhưng khác ngày

        assertThat(search(new Criteria(null, LocalDate.parse("2027-01-10"), 2, TourSort.FEATURED, 1)).total()).isZero();
        assertThat(search(new Criteria(null, LocalDate.parse("2027-01-10"), 1, TourSort.FEATURED, 1)).total()).isEqualTo(1);
    }

    // --- sắp xếp ---

    private void threeToursWithDifferentPricesDatesAndRatings() {
        Tour a = tour(1, "A", DA_LAT, false, "4.2", 10);
        departure(a, "2027-03-01", 500, 20, 0);
        Tour b = tour(2, "B", DA_LAT, true, "4.0", 99);
        departure(b, "2027-01-01", 900, 20, 0);
        Tour c = tour(3, "C", DA_LAT, false, "4.9", 5);
        departure(c, "2027-02-01", 100, 20, 0);
        tour(4, "D hết chỗ", DA_LAT, true, "5.0", 999); // không có chuyến: luôn cuối
    }

    @Test
    void priceAscendingAndDescendingKeepTheTourWithoutPriceLast() {
        threeToursWithDifferentPricesDatesAndRatings();

        assertThat(ids(search(sorted(TourSort.PRICE_ASC)))).containsExactly(3L, 1L, 2L, 4L);
        assertThat(ids(search(sorted(TourSort.PRICE_DESC)))).containsExactly(2L, 1L, 3L, 4L);
    }

    @Test
    void nearestDepartureSortsByDate() {
        threeToursWithDifferentPricesDatesAndRatings();

        assertThat(ids(search(sorted(TourSort.NEAREST_DEPARTURE)))).containsExactly(2L, 3L, 1L, 4L);
    }

    @Test
    void ratingSortsByRatingThenReviewCount() {
        threeToursWithDifferentPricesDatesAndRatings();
        Tour tie = tour(5, "E", DA_LAT, false, "4.2", 50);
        departure(tie, "2027-03-01", 700, 20, 0);

        // C 4.9; A và E cùng 4.2 nhưng E nhiều đánh giá hơn; B 4.0; D (hết chỗ) cuối.
        assertThat(ids(search(sorted(TourSort.RATING)))).containsExactly(3L, 5L, 1L, 2L, 4L);
    }

    @Test
    void featuredPutsFeaturedToursFirstThenRatingThenReviewCount() {
        threeToursWithDifferentPricesDatesAndRatings();

        // B nổi bật nên lên đầu dù điểm thấp hơn; còn lại theo điểm; D nổi bật nhưng hết chỗ nên cuối.
        assertThat(ids(search(sorted(TourSort.FEATURED)))).containsExactly(2L, 3L, 1L, 4L);
    }

    @Test
    void equalKeysFallBackToIdSoThePageOrderIsStable() {
        for (long id = 1; id <= 3; id++) {
            Tour tour = tour(id, "T" + id, DA_LAT, false, "4.0", 1);
            departure(tour, "2027-01-10", 500, 20, 0);
        }

        for (TourSort sort : TourSort.values()) {
            assertThat(ids(search(sorted(sort)))).as(sort.name()).containsExactly(1L, 2L, 3L);
        }
    }

    @Test
    void severalToursWithoutDeparturesDoNotBreakPriceOrDateSorting() {
        tour(1, "A", DA_LAT, false, "4.0", 1);
        tour(2, "B", DA_LAT, false, "4.0", 1);

        assertThat(ids(search(sorted(TourSort.PRICE_ASC)))).containsExactly(1L, 2L);
        assertThat(ids(search(sorted(TourSort.PRICE_DESC)))).containsExactly(1L, 2L);
        assertThat(ids(search(sorted(TourSort.NEAREST_DEPARTURE)))).containsExactly(1L, 2L);
    }

    // --- phân trang ---

    private void tours(int count) {
        for (long id = 1; id <= count; id++) {
            Tour tour = tour(id, "T" + id, DA_LAT, false, "4.0", 1);
            departure(tour, "2027-01-10", 500, 20, 0);
        }
    }

    @Test
    void pagesHoldEightToursEach() {
        tours(10);

        Result first = search(new Criteria(null, null, null, TourSort.FEATURED, 1));
        Result second = search(new Criteria(null, null, null, TourSort.FEATURED, 2));

        assertThat(first.items()).hasSize(8);
        assertThat(second.items()).hasSize(2);
        assertThat(first.total()).isEqualTo(10);
        assertThat(first.pageCount()).isEqualTo(2);
        assertThat(ids(second)).containsExactly(9L, 10L);
    }

    @Test
    void exactMultipleOfPageSizeHasNoEmptyLastPage() {
        tours(8);

        assertThat(search(sorted(TourSort.FEATURED)).pageCount()).isEqualTo(1);
    }

    @Test
    void pageBeyondTheLastIsClampedEvenWhenHuge() {
        tours(10);

        Result beyond = search(new Criteria(null, null, null, TourSort.FEATURED, 99));
        // Integer.MAX_VALUE mà nhân với PAGE_SIZE sẽ tràn int nếu không kẹp trước.
        Result huge = search(new Criteria(null, null, null, TourSort.FEATURED, Integer.MAX_VALUE));

        assertThat(beyond.page()).isEqualTo(2);
        assertThat(ids(beyond)).containsExactly(9L, 10L);
        assertThat(huge.page()).isEqualTo(2);
        assertThat(ids(huge)).containsExactly(9L, 10L);
    }

    @Test
    void emptyResultStillHasOnePage() {
        Result result = search(sorted(TourSort.FEATURED));

        assertThat(result.items()).isEmpty();
        assertThat(result.total()).isZero();
        assertThat(result.page()).isEqualTo(1);
        assertThat(result.pageCount()).isEqualTo(1);
    }
}
