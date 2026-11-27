package com.gotrips.gotrips_api.hotel;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import com.gotrips.gotrips_api.common.error.InvalidRequestException;

/**
 * Luật tìm khách sạn và tính tiền lưu trú. Bộ số lấy từ {@code hotel-view.test.ts} của web (nơi các luật này từng
 * nằm) để kết quả không đổi khi chuyển sang API.
 */
class HotelStayCalculatorTests {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 25);
    private static final LocalDate CHECK_IN = LocalDate.of(2027, 1, 10);
    private static final LocalDate CHECK_OUT = LocalDate.of(2027, 1, 12);

    private static Hotel hotel(long id, String rating) {
        return Hotel.builder().id(id).rating(new BigDecimal(rating)).build();
    }

    private static HotelRoomType room(long id, long hotelId, long price, int maxGuests) {
        return room(id, hotelId, price, maxGuests, 10);
    }

    private static HotelRoomType room(long id, long hotelId, long price, int maxGuests, int totalRooms) {
        return HotelRoomType.builder().id(id).hotelId(hotelId).name("Phòng " + id).pricePerNight(price)
                .maxGuests(maxGuests).totalRooms(totalRooms).build();
    }

    // Khách sạn 1 (điểm cao hơn) chỉ có phòng đắt 2 khách; khách sạn 2 có hai loại phòng 2 và 4 khách.
    private static final List<Hotel> HOTELS = List.of(hotel(1, "4.9"), hotel(2, "4.1"));
    private static final Map<Long, List<HotelRoomType>> ROOMS = Map.of(
            1L, List.of(room(11, 1, 2_000_000, 2)),
            2L, List.of(room(22, 2, 1_100_000, 4), room(21, 2, 800_000, 2)));

    /** {@code [id khách sạn, id phòng, số đêm, tổng tiền]} của từng kết quả theo thứ tự trả về. */
    private static List<List<Long>> shape(List<HotelStayCalculator.Entry> entries) {
        List<List<Long>> shape = new ArrayList<>();
        for (HotelStayCalculator.Entry e : entries) {
            shape.add(List.of(e.hotel().getId(), e.room().getId(), (long) e.nights(), e.totalPrice()));
        }
        return shape;
    }

    private static List<HotelStayCalculator.Entry> search(int guests, int rooms) {
        return HotelStayCalculator.search(HOTELS, ROOMS, Map.of(),
                new HotelStayCalculator.Criteria(CHECK_IN, CHECK_OUT, guests, rooms));
    }

    @Test
    void picksTheCheapestFittingRoomAndSortsByTotalPrice() {
        assertThat(shape(search(2, 1))).containsExactly(
                List.of(2L, 21L, 2L, 1_600_000L),
                List.of(1L, 11L, 2L, 4_000_000L));
    }

    @Test
    void dropsHotelsWhoseRoomsCannotHoldTheGuests() {
        // 4 khách / 1 phòng: khách sạn 1 chỉ chứa 2 nên bị bỏ; khách sạn 2 chuyển sang loại phòng 4 khách.
        assertThat(shape(search(4, 1))).containsExactly(List.of(2L, 22L, 2L, 2_200_000L));
    }

    @Test
    void multipliesByTheNumberOfRooms() {
        assertThat(shape(search(4, 2))).containsExactly(
                List.of(2L, 21L, 2L, 3_200_000L),
                List.of(1L, 11L, 2L, 8_000_000L));
    }

    @Test
    void minPricePerNightIsTheCheapestOfAllRoomsNotOnlyTheFittingOne() {
        // Khách sạn 2 với 4 khách phải ở phòng 1,1 triệu, nhưng "giá từ" của thẻ vẫn là phòng rẻ nhất (800.000).
        HotelStayCalculator.Entry entry = search(4, 1).get(0);
        assertThat(entry.room().getPricePerNight()).isEqualTo(1_100_000);
        assertThat(entry.minPricePerNight()).isEqualTo(800_000);
    }

    @Test
    void returnsNothingWhenNoRoomFits() {
        assertThat(search(5, 1)).isEmpty();
    }

    @Test
    void skipsHotelsWithoutRoomTypes() {
        List<Hotel> hotels = List.of(hotel(1, "4.9"), hotel(3, "5.0"));
        assertThat(HotelStayCalculator.search(hotels, ROOMS, Map.of(),
                new HotelStayCalculator.Criteria(CHECK_IN, CHECK_OUT, 2, 1)))
                .extracting(e -> e.hotel().getId()).containsExactly(1L);
    }

    @Test
    void tiesOnTotalPriceAreBrokenByRatingThenId() {
        // Cùng giá 1.000.000 × 2 đêm: điểm cao trước, cùng điểm thì id nhỏ trước.
        List<Hotel> hotels = List.of(hotel(5, "4.0"), hotel(6, "4.8"), hotel(3, "4.0"));
        Map<Long, List<HotelRoomType>> rooms = Map.of(
                5L, List.of(room(51, 5, 1_000_000, 2)),
                6L, List.of(room(61, 6, 1_000_000, 2)),
                3L, List.of(room(31, 3, 1_000_000, 2)));

        assertThat(HotelStayCalculator.search(hotels, rooms, Map.of(),
                new HotelStayCalculator.Criteria(CHECK_IN, CHECK_OUT, 2, 1)))
                .extracting(e -> e.hotel().getId()).containsExactly(6L, 3L, 5L);
    }

    @Test
    void doesNotModifyTheInputs() {
        List<HotelRoomType> unsorted = new ArrayList<>(List.of(room(2, 1, 900_000, 2), room(1, 1, 500_000, 2)));
        HotelStayCalculator.sortRoomTypes(unsorted);
        assertThat(unsorted).extracting(HotelRoomType::getId).containsExactly(2L, 1L);
    }

    @Test
    void roomFitsGuestsNeedsAtLeastOneGuestPerRoomAndAtMostMaxGuestsPerRoom() {
        assertThat(HotelStayCalculator.roomFitsGuests(room(1, 1, 1, 2), 4, 2)).isTrue();
        assertThat(HotelStayCalculator.roomFitsGuests(room(1, 1, 1, 2), 5, 2)).isFalse();
        assertThat(HotelStayCalculator.roomFitsGuests(room(1, 1, 1, 4), 1, 2)).isFalse();
        assertThat(HotelStayCalculator.roomFitsGuests(room(1, 1, 1, 4), 1, 0)).isFalse();
    }

    @Test
    void findCheapestAvailableRoomUsesTheCheapestRoomThatHoldsEnoughGuests() {
        List<HotelRoomType> rooms = List.of(room(1, 1, 900_000, 2), room(2, 1, 1_500_000, 4), room(3, 1, 1_200_000, 3));

        assertThat(cheapest(rooms, Map.of(), 2, 1)).contains(1L);
        assertThat(cheapest(rooms, Map.of(), 3, 1)).contains(3L);
        assertThat(cheapest(rooms, Map.of(), 4, 1)).contains(2L);
        assertThat(cheapest(rooms, Map.of(), 5, 1)).isEmpty();
    }

    private static Optional<Long> cheapest(List<HotelRoomType> roomTypes, Map<Long, Long> booked, int guests, int rooms) {
        return HotelStayCalculator.findCheapestAvailableRoom(roomTypes, booked, guests, rooms).map(HotelRoomType::getId);
    }

    // ---- Phòng trống: tổng phòng - phòng của đơn chưa huỷ giao khoảng ngày ----

    @ParameterizedTest
    @CsvSource({ "10, 0, 10", "10, 7, 3", "10, 10, 0", "10, 12, 0", "0, 0, 0" })
    void availableRoomsIsTotalMinusBookedAndNeverNegative(int total, long booked, int expected) {
        assertThat(HotelStayCalculator.availableRooms(total, booked)).isEqualTo(expected);
    }

    @Test
    void skipsRoomTypesWithoutEnoughFreeRoomsAndFallsBackToTheNextCheapest() {
        List<HotelRoomType> rooms = List.of(room(1, 1, 900_000, 2, 3), room(2, 1, 1_500_000, 2, 3));

        // Phòng rẻ còn 1: đủ cho 1 phòng, không đủ cho 2 phòng.
        assertThat(cheapest(rooms, Map.of(1L, 2L), 2, 1)).contains(1L);
        assertThat(cheapest(rooms, Map.of(1L, 2L), 4, 2)).contains(2L);
        assertThat(cheapest(rooms, Map.of(1L, 3L, 2L, 2L), 2, 1)).contains(2L);
        assertThat(cheapest(rooms, Map.of(1L, 3L, 2L, 3L), 2, 1)).isEmpty();
    }

    @Test
    void searchDropsHotelsWithoutFreeRoomsButKeepsThePriceFromOfAllRooms() {
        // Khách sạn 1 hết phòng (phòng 11), khách sạn 2 hết phòng rẻ (21) nên chuyển sang phòng 22.
        List<HotelStayCalculator.Entry> entries = HotelStayCalculator.search(HOTELS, ROOMS,
                Map.of(11L, 10L, 21L, 10L), new HotelStayCalculator.Criteria(CHECK_IN, CHECK_OUT, 2, 1));

        assertThat(shape(entries)).containsExactly(List.of(2L, 22L, 2L, 2_200_000L));
        assertThat(entries.get(0).minPricePerNight()).isEqualTo(800_000);
    }

    @Test
    void bookingRequiresCheckInFromTomorrow() {
        HotelStayCalculator.validateBookingCheckIn(TODAY.plusDays(1), TODAY);
        assertThatThrownBy(() -> HotelStayCalculator.validateBookingCheckIn(TODAY, TODAY))
                .isInstanceOfSatisfying(InvalidRequestException.class, e -> {
                    assertThat(e.getField()).isEqualTo("checkIn");
                    assertThat(e.getMessage()).isEqualTo(HotelStayCalculator.SAME_DAY_CHECK_IN_MESSAGE);
                });
    }

    @Test
    void countsNightsAndComputesTheStayTotal() {
        assertThat(HotelStayCalculator.countNights(LocalDate.of(2026, 12, 30), LocalDate.of(2027, 1, 2))).isEqualTo(3);
        assertThat(HotelStayCalculator.computeStayTotal(1_250_000, 3, 2)).isEqualTo(7_500_000);
    }

    @Test
    void minPricePerNightIsEmptyWithoutRooms() {
        assertThat(HotelStayCalculator.minPricePerNight(List.of())).isEmpty();
    }

    // ---- validateStay: cùng thứ tự và câu chữ với checkStayDates + rooms ≤ guests của web ----

    @Test
    void acceptsCheckInTodayAndExactlyThirtyNights() {
        HotelStayCalculator.validateStay(TODAY, TODAY.plusDays(30), 2, 1, TODAY);
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            2026-11-24 | 2026-11-26 | 2 | 1 | checkIn  | Ngày nhận phòng không được ở quá khứ.
            2026-12-01 | 2026-12-01 | 2 | 1 | checkOut | Ngày trả phòng phải sau ngày nhận phòng.
            2026-12-02 | 2026-12-01 | 2 | 1 | checkOut | Ngày trả phòng phải sau ngày nhận phòng.
            2026-12-01 | 2027-01-01 | 2 | 1 | checkOut | Mỗi lần đặt tối đa 30 đêm.
            2026-12-01 | 2026-12-03 | 2 | 3 | rooms    | Số phòng không được nhiều hơn số khách.
            """)
    void rejectsInvalidStaysWithTheFieldAndMessageTheWebShows(LocalDate checkIn, LocalDate checkOut, int guests,
            int rooms, String field, String message) {
        assertThatThrownBy(() -> HotelStayCalculator.validateStay(checkIn, checkOut, guests, rooms, TODAY))
                .isInstanceOfSatisfying(InvalidRequestException.class, e -> {
                    assertThat(e.getField()).isEqualTo(field);
                    assertThat(e.getMessage()).isEqualTo(message);
                });
    }

    @Test
    void reportsThePastCheckInBeforeTheOtherProblems() {
        // Ngày nhận ở quá khứ VÀ ngày trả không sau ngày nhận: lỗi đầu tiên theo thứ tự (như web) là ngày nhận.
        assertThatThrownBy(() -> HotelStayCalculator.validateStay(TODAY.minusDays(1), TODAY.minusDays(2), 1, 5, TODAY))
                .isInstanceOfSatisfying(InvalidRequestException.class,
                        e -> assertThat(e.getField()).isEqualTo("checkIn"));
    }

    // ---- Số phòng bị giữ cao nhất trong một đêm (mức tối thiểu khi giảm tổng số phòng) ----

    /** "ngày nhận..ngày trả x số phòng", ví dụ {@code 2027-01-10..2027-01-12x2}; nhiều kỳ cách nhau bằng dấu cách. */
    private static List<HotelStayCalculator.Stay> stays(String text) {
        List<HotelStayCalculator.Stay> stays = new ArrayList<>();
        for (String stay : text.isBlank() ? new String[0] : text.split(" ")) {
            String[] parts = stay.split("\\.\\.|x");
            stays.add(new HotelStayCalculator.Stay(LocalDate.parse(parts[0]), LocalDate.parse(parts[1]),
                    Integer.parseInt(parts[2])));
        }
        return stays;
    }

    @ParameterizedTest(name = "{0}")
    @CsvSource(delimiter = '|', textBlock = """
            không có đơn nào                     | ''                                                                        | 0
            hai kỳ không chung đêm nào           | 2027-01-10..2027-01-12x2 2027-01-20..2027-01-22x2                         | 2
            trả phòng và nhận phòng cùng ngày    | 2027-01-10..2027-01-12x2 2027-01-12..2027-01-14x3                         | 3
            tiếp giáp, kỳ sau đưa vào trước      | 2027-01-12..2027-01-14x3 2027-01-10..2027-01-12x2                         | 3
            đêm đông nhất có ba đơn chồng        | 2027-01-10..2027-01-13x2 2027-01-12..2027-01-14x1 2027-01-12..2027-01-13x1 | 4
            kỳ nằm trọn trong kỳ khác            | 2027-01-10..2027-01-20x1 2027-01-12..2027-01-14x2                         | 3
            chồng nhau đúng một đêm              | 2027-01-10..2027-01-12x2 2027-01-11..2027-01-13x2                         | 4
            kỳ đã qua không tính                 | 2026-11-01..2026-11-05x9 2027-01-10..2027-01-12x1                         | 1
            trả phòng hôm nay không còn giữ      | 2026-11-23..2026-11-25x9                                                  | 0
            đang ở vẫn giữ phòng đêm nay         | 2026-11-24..2026-11-26x2 2026-11-25..2026-11-27x1                         | 3
            đêm đông ở quá khứ không kéo đỉnh lên | 2026-11-20..2026-11-22x5 2026-11-20..2026-11-30x1                         | 1
            """)
    void peakRoomsHeldCountsTheBusiestNightFromTonight(String label, String stays, int expected) {
        assertThat(HotelStayCalculator.peakRoomsHeld(stays(stays), TODAY)).isEqualTo(expected);
    }
}
