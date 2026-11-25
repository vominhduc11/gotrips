package com.gotrips.gotrips_api.tour;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.gotrips.gotrips_api.common.catalog.CatalogStatus;
import com.gotrips.gotrips_api.destination.Destination;

/**
 * Kiểm thử từng trường hợp biên của phép tính thẻ tour (hàm thuần, không cần DB). Các ca bám theo dữ liệu mock
 * của gotrips-web (tour 1: chuyến rẻ nhất đã đầy; tour 3: giảm giá; tour 5: sắp hết chỗ) để hai bên cho cùng kết quả.
 */
class TourCardCalculatorTests {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 25);

    private static Tour tour() {
        Destination destination = Destination.builder().id(1L).slug("da-lat").name("Đà Lạt")
                .region("Tây Nguyên").imageUrl("u").imageAlt("a").build();
        return Tour.builder().id(1L).slug("tour-1").title("Tour 1").destination(destination)
                .durationDays(3).durationNights(2).departureCity("TP. Hồ Chí Minh")
                .coverImageUrl("cover").coverImageAlt("alt").rating(new BigDecimal("4.8")).reviewCount(312)
                .featured(true).status(CatalogStatus.ACTIVE).build();
    }

    private static TourDeparture departure(long id, String date, long price, Long originalPrice, int total, int booked) {
        return TourDeparture.builder().id(id).tourId(1L).departureDate(LocalDate.parse(date)).price(price)
                .originalPrice(originalPrice).totalSeats(total).bookedSeats(booked).build();
    }

    @Test
    void tourWithoutAnyDepartureHasNoDerivedFields() {
        TourCardResponse card = TourCardCalculator.toCard(tour(), List.of(), TODAY);

        assertThat(card.nextDepartureDate()).isNull();
        assertThat(card.seatsLeft()).isNull();
        assertThat(card.priceFrom()).isNull();
        assertThat(card.originalPriceFrom()).isNull();
        assertThat(card.discountPercent()).isNull();
        assertThat(card.isAlmostFull()).isFalse();
    }

    @Test
    void copiesTourAndDestinationFields() {
        TourCardResponse card = TourCardCalculator.toCard(tour(), List.of(), TODAY);

        assertThat(card.id()).isEqualTo(1L);
        assertThat(card.destinationName()).isEqualTo("Đà Lạt");
        assertThat(card.destinationSlug()).isEqualTo("da-lat");
        assertThat(card.rating()).isEqualTo(4.8);
        assertThat(card.reviewCount()).isEqualTo(312);
        assertThat(card.coverImage()).isEqualTo("cover");
    }

    @Test
    void soldOutDepartureIsSkippedEvenWhenItIsTheCheapestAndEarliest() {
        // Giống tour 1 của mock: chuyến 09/01 rẻ nhất nhưng đã đầy ⇒ "giá từ" và "ngày gần nhất" phải bỏ qua nó.
        List<TourDeparture> departures = List.of(
                departure(1, "2027-01-09", 3_190_000, null, 20, 20),
                departure(2, "2027-01-23", 3_490_000, null, 20, 11),
                departure(3, "2027-02-20", 3_390_000, null, 20, 6),
                departure(4, "2027-03-13", 3_290_000, null, 20, 16));

        TourCardResponse card = TourCardCalculator.toCard(tour(), departures, TODAY);

        assertThat(card.nextDepartureDate()).isEqualTo(LocalDate.of(2027, 1, 23));
        assertThat(card.seatsLeft()).isEqualTo(9);
        // Giá từ lấy ở chuyến 13/03, khác chuyến gần nhất 23/01.
        assertThat(card.priceFrom()).isEqualTo(3_290_000L);
        assertThat(card.isAlmostFull()).isFalse();
    }

    @Test
    void departureOnTodayOrInThePastIsNotBookable() {
        List<TourDeparture> departures = List.of(
                departure(1, "2026-11-24", 100, null, 20, 0),
                departure(2, "2026-11-25", 100, null, 20, 0),
                departure(3, "2026-11-26", 500, null, 20, 0));

        TourCardResponse card = TourCardCalculator.toCard(tour(), departures, TODAY);

        // Chỉ chuyến ngày mai trở đi mới đặt được (đặt trực tuyến từ ngày mai).
        assertThat(card.nextDepartureDate()).isEqualTo(LocalDate.of(2026, 11, 26));
        assertThat(card.priceFrom()).isEqualTo(500L);
    }

    @Test
    void discountComesFromTheCheapestDepartureItself() {
        // Giống tour 3 của mock: giá từ ở chuyến 08/04 (8.49tr, gốc 10.49tr) ⇒ giảm 19%.
        List<TourDeparture> departures = List.of(
                departure(8, "2027-01-14", 8_990_000, 10_990_000L, 24, 14),
                departure(9, "2027-02-25", 9_490_000, 11_490_000L, 24, 20),
                departure(10, "2027-04-08", 8_490_000, 10_490_000L, 24, 9));

        TourCardResponse card = TourCardCalculator.toCard(tour(), departures, TODAY);

        assertThat(card.nextDepartureDate()).isEqualTo(LocalDate.of(2027, 1, 14));
        assertThat(card.priceFrom()).isEqualTo(8_490_000L);
        assertThat(card.originalPriceFrom()).isEqualTo(10_490_000L);
        assertThat(card.discountPercent()).isEqualTo(19);
    }

    @Test
    void otherDepartureDiscountDoesNotLeakIntoTheCheapestOne() {
        // Chuyến rẻ nhất không giảm giá, chuyến đắt hơn có giảm sâu: thẻ không được hiện giảm giá.
        List<TourDeparture> departures = List.of(
                departure(1, "2027-01-10", 1_000_000, null, 20, 0),
                departure(2, "2027-01-20", 2_000_000, 4_000_000L, 20, 0));

        TourCardResponse card = TourCardCalculator.toCard(tour(), departures, TODAY);

        assertThat(card.priceFrom()).isEqualTo(1_000_000L);
        assertThat(card.originalPriceFrom()).isNull();
        assertThat(card.discountPercent()).isNull();
    }

    @Test
    void originalPriceNotAbovePriceMeansNoDiscount() {
        TourCardResponse equal = TourCardCalculator.toCard(tour(),
                List.of(departure(1, "2027-01-10", 1_000_000, 1_000_000L, 20, 0)), TODAY);
        TourCardResponse lower = TourCardCalculator.toCard(tour(),
                List.of(departure(1, "2027-01-10", 1_000_000, 900_000L, 20, 0)), TODAY);

        assertThat(equal.originalPriceFrom()).isNull();
        assertThat(equal.discountPercent()).isNull();
        assertThat(lower.originalPriceFrom()).isNull();
        assertThat(lower.discountPercent()).isNull();
    }

    @Test
    void discountPercentRoundsHalfUpLikeTheWebApp() {
        // 1/200 = 0,5% ⇒ 1; 1/8 = 12,5% ⇒ 13 (Math.round của JS và Java đều làm tròn .5 lên).
        TourCardResponse half = TourCardCalculator.toCard(tour(),
                List.of(departure(1, "2027-01-10", 199, 200L, 20, 0)), TODAY);
        TourCardResponse twelveAndHalf = TourCardCalculator.toCard(tour(),
                List.of(departure(1, "2027-01-10", 7, 8L, 20, 0)), TODAY);

        assertThat(half.discountPercent()).isEqualTo(1);
        assertThat(twelveAndHalf.discountPercent()).isEqualTo(13);
    }

    @Test
    void almostFullThresholdIsFiveSeatsInclusive() {
        TourCardResponse five = TourCardCalculator.toCard(tour(),
                List.of(departure(1, "2027-01-10", 100, null, 20, 15)), TODAY);
        TourCardResponse six = TourCardCalculator.toCard(tour(),
                List.of(departure(1, "2027-01-10", 100, null, 20, 14)), TODAY);
        TourCardResponse three = TourCardCalculator.toCard(tour(),
                List.of(departure(1, "2027-01-10", 100, null, 20, 17)), TODAY);

        assertThat(five.seatsLeft()).isEqualTo(5);
        assertThat(five.isAlmostFull()).isTrue();
        assertThat(six.seatsLeft()).isEqualTo(6);
        assertThat(six.isAlmostFull()).isFalse();
        assertThat(three.isAlmostFull()).isTrue();
    }

    @Test
    void almostFullUsesTheNearestDepartureNotTheCheapestOne() {
        // Giống tour 5 của mock: chuyến gần nhất còn 3 chỗ (sắp hết), chuyến rẻ hơn ở sau còn nhiều chỗ.
        List<TourDeparture> departures = List.of(
                departure(1, "2027-01-17", 3_890_000, null, 20, 17),
                departure(2, "2027-03-27", 3_790_000, null, 20, 10));

        TourCardResponse card = TourCardCalculator.toCard(tour(), departures, TODAY);

        assertThat(card.seatsLeft()).isEqualTo(3);
        assertThat(card.isAlmostFull()).isTrue();
        assertThat(card.priceFrom()).isEqualTo(3_790_000L);
    }

    @Test
    void equalPricesPickTheEarlierDeparture() {
        List<TourDeparture> departures = List.of(
                departure(1, "2027-03-10", 1_000_000, 1_500_000L, 20, 0),
                departure(2, "2027-02-10", 1_000_000, null, 20, 0));

        TourCardResponse card = TourCardCalculator.toCard(tour(), departures, TODAY);

        // Chuyến 10/02 sớm hơn nên là chuyến "rẻ nhất": không có giá gốc ⇒ không hiện giảm giá.
        assertThat(card.originalPriceFrom()).isNull();
        assertThat(card.nextDepartureDate()).isEqualTo(LocalDate.of(2027, 2, 10));
    }
}
