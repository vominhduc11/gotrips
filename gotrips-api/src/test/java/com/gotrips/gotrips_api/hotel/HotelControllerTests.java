package com.gotrips.gotrips_api.hotel;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.gotrips.gotrips_api.support.CatalogApiTest;

/** GET /hotels/featured, GET /hotels (tìm) và GET /hotels/{slug} (chi tiết). */
class HotelControllerTests extends CatalogApiTest {

    @Test
    void featuredIsPublicAndEmptyWithoutData() throws Exception {
        mvc.perform(get("/hotels/featured"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void featuredSkipsHiddenHotelsAndHotelsWithoutRoomTypes() throws Exception {
        long destination = data.destination("phu-quoc", "Phú Quốc");

        long hidden = data.hotel("khach-san-an", destination, "HIDDEN", 4.9, 3000);
        data.room(hidden, 3_600_000);

        data.hotel("khach-san-chua-co-phong", destination, "ACTIVE", 4.9, 3000);

        long shown = data.hotel("khach-san-hien-thi", destination, "ACTIVE", 4.5, 100);
        data.room(shown, 1_450_000);

        mvc.perform(get("/hotels/featured"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(shown))
                .andExpect(jsonPath("$[0].slug").value("khach-san-hien-thi"))
                .andExpect(jsonPath("$[0].destinationName").value("Phú Quốc"))
                .andExpect(jsonPath("$[0].destinationSlug").value("phu-quoc"))
                .andExpect(jsonPath("$[0].area").value("Khu vực"))
                .andExpect(jsonPath("$[0].starRating").value(4))
                .andExpect(jsonPath("$[0].rating").value(4.5))
                .andExpect(jsonPath("$[0].reviewCount").value(100));
    }

    @Test
    void minPricePerNightIsTheCheapestRoomType() throws Exception {
        long destination = data.destination("da-lat", "Đà Lạt");
        long hotel = data.hotel("doi-may", destination, "ACTIVE", 4.6, 1280);
        data.room(hotel, 1_980_000);
        data.room(hotel, 1_250_000);
        data.room(hotel, 2_500_000);

        mvc.perform(get("/hotels/featured"))
                .andExpect(jsonPath("$[0].minPricePerNight").value(1_250_000));
    }

    @Test
    void featuredSortsByRatingThenReviewCountThenId() throws Exception {
        long destination = data.destination("da-lat", "Đà Lạt");
        long fewerReviews = data.hotel("a-4-5-it", destination, "ACTIVE", 4.5, 10);
        long best = data.hotel("b-4-8", destination, "ACTIVE", 4.8, 5);
        long moreReviews = data.hotel("c-4-5-nhieu", destination, "ACTIVE", 4.5, 20);
        long sameAsFirst = data.hotel("d-4-5-it", destination, "ACTIVE", 4.5, 10);
        for (long hotel : new long[] { fewerReviews, best, moreReviews, sameAsFirst }) {
            data.room(hotel, 1_000_000);
        }

        mvc.perform(get("/hotels/featured"))
                .andExpect(jsonPath("$", hasSize(4)))
                .andExpect(jsonPath("$[0].id").value(best))
                .andExpect(jsonPath("$[1].id").value(moreReviews))
                .andExpect(jsonPath("$[2].id").value(fewerReviews))
                .andExpect(jsonPath("$[3].id").value(sameAsFirst));
    }

    @Test
    void limitIsAppliedAfterTheFilterAndDefaultsToFour() throws Exception {
        long destination = data.destination("da-lat", "Đà Lạt");
        // Khách sạn điểm cao nhất chưa có phòng: nếu cắt limit trước khi lọc, kết quả sẽ thiếu.
        data.hotel("chua-co-phong", destination, "ACTIVE", 5.0, 1);
        for (int i = 1; i <= 6; i++) {
            long hotel = data.hotel("khach-san-" + i, destination, "ACTIVE", 4.0, i);
            data.room(hotel, 1_000_000);
        }

        mvc.perform(get("/hotels/featured"))
                .andExpect(jsonPath("$", hasSize(4)));
        mvc.perform(get("/hotels/featured").param("limit", "2"))
                .andExpect(jsonPath("$", hasSize(2)));
    }

    // ------------------------------------------------------------------------------------------------------------
    // GET /hotels (tìm). "Hôm nay" của test là 25/11/2026 (Clock cố định trong TestcontainersConfiguration).
    // ------------------------------------------------------------------------------------------------------------

    private MockHttpServletRequestBuilder search(String destination, String checkIn, String checkOut, int guests,
            int rooms) {
        return get("/hotels").param("destination", destination).param("checkIn", checkIn).param("checkOut", checkOut)
                .param("guests", String.valueOf(guests)).param("rooms", String.valueOf(rooms));
    }

    /** Hai khách sạn Đà Lạt: A (4,6; một phòng 2 khách 2.000.000) và B (4,1; phòng 2 khách 800.000 + phòng 4 khách 1.100.000). */
    private long[] daLatHotels() {
        long destination = data.destination("da-lat", "Đà Lạt");
        long a = data.hotel("khach-san-a", destination, "ACTIVE", 4.6, 1280);
        data.room(a, "Phòng Deluxe", 2_000_000, 2);
        long b = data.hotel("khach-san-b", destination, "ACTIVE", 4.1, 640);
        data.room(b, "Phòng Gia đình", 1_100_000, 4);
        data.room(b, "Phòng Standard", 800_000, 2);
        return new long[] { a, b };
    }

    @Test
    void searchReturnsTheCheapestFittingRoomAndTheStayTotalSortedByTotal() throws Exception {
        long[] hotels = daLatHotels();

        mvc.perform(search("da-lat", "2027-01-10", "2027-01-12", 2, 1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.destinationName").value("Đà Lạt"))
                .andExpect(jsonPath("$.items", hasSize(2)))
                .andExpect(jsonPath("$.items[0].id").value(hotels[1]))
                .andExpect(jsonPath("$.items[0].slug").value("khach-san-b"))
                .andExpect(jsonPath("$.items[0].destinationSlug").value("da-lat"))
                .andExpect(jsonPath("$.items[0].room.name").value("Phòng Standard"))
                .andExpect(jsonPath("$.items[0].room.pricePerNight").value(800_000))
                .andExpect(jsonPath("$.items[0].room.maxGuests").value(2))
                .andExpect(jsonPath("$.items[0].room.bedType").value("1 giường đôi"))
                .andExpect(jsonPath("$.items[0].room.areaM2").value(25))
                .andExpect(jsonPath("$.items[0].nights").value(2))
                .andExpect(jsonPath("$.items[0].rooms").value(1))
                .andExpect(jsonPath("$.items[0].totalPrice").value(1_600_000))
                .andExpect(jsonPath("$.items[0].minPricePerNight").value(800_000))
                .andExpect(jsonPath("$.items[1].id").value(hotels[0]))
                .andExpect(jsonPath("$.items[1].totalPrice").value(4_000_000));
    }

    @Test
    void searchSwitchesToALargerRoomWhenTheGuestsDoNotFitAndMultipliesByRooms() throws Exception {
        long[] hotels = daLatHotels();

        // 4 khách / 1 phòng: khách sạn A (tối đa 2) bị bỏ, B đổi sang phòng gia đình 1.100.000 × 2 đêm.
        mvc.perform(search("da-lat", "2027-01-10", "2027-01-12", 4, 1))
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].id").value(hotels[1]))
                .andExpect(jsonPath("$.items[0].room.name").value("Phòng Gia đình"))
                .andExpect(jsonPath("$.items[0].totalPrice").value(2_200_000))
                // "Giá từ" của thẻ vẫn là phòng rẻ nhất của khách sạn, không phải phòng đang được chọn.
                .andExpect(jsonPath("$.items[0].minPricePerNight").value(800_000));

        // 4 khách / 2 phòng: cả hai vừa; tổng = giá × 2 đêm × 2 phòng.
        mvc.perform(search("da-lat", "2027-01-10", "2027-01-12", 4, 2))
                .andExpect(jsonPath("$.items", hasSize(2)))
                .andExpect(jsonPath("$.items[0].totalPrice").value(3_200_000))
                .andExpect(jsonPath("$.items[1].totalPrice").value(8_000_000))
                .andExpect(jsonPath("$.items[1].rooms").value(2));
    }

    @Test
    void searchSkipsHiddenHotelsHotelsWithoutRoomsAndOtherDestinations() throws Exception {
        long daLat = data.destination("da-lat", "Đà Lạt");
        long phuQuoc = data.destination("phu-quoc", "Phú Quốc");
        long shown = data.hotel("hien-thi", daLat, "ACTIVE", 4.0, 10);
        data.room(shown, 1_000_000);
        long hidden = data.hotel("bi-an", daLat, "HIDDEN", 5.0, 10);
        data.room(hidden, 500_000);
        data.hotel("chua-co-phong", daLat, "ACTIVE", 5.0, 10);
        long elsewhere = data.hotel("o-phu-quoc", phuQuoc, "ACTIVE", 5.0, 10);
        data.room(elsewhere, 500_000);

        mvc.perform(search("da-lat", "2027-01-10", "2027-01-12", 2, 1))
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].id").value(shown));
    }

    @Test
    void searchWithAnUnknownDestinationIsEmptyWithANullNameNotEveryHotel() throws Exception {
        long destination = data.destination("da-lat", "Đà Lạt");
        long hotel = data.hotel("khach-san", destination, "ACTIVE", 4.0, 10);
        data.room(hotel, 1_000_000);

        mvc.perform(search("khong-co", "2027-01-10", "2027-01-12", 2, 1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.destinationName").value(nullValue()))
                .andExpect(jsonPath("$.items", hasSize(0)));
    }

    @Test
    void searchBreaksTiesOnTotalByRatingThenId() throws Exception {
        long destination = data.destination("da-lat", "Đà Lạt");
        long lowFirst = data.hotel("a-4-0", destination, "ACTIVE", 4.0, 10);
        long best = data.hotel("b-4-8", destination, "ACTIVE", 4.8, 10);
        long lowSecond = data.hotel("c-4-0", destination, "ACTIVE", 4.0, 10);
        for (long hotel : new long[] { lowFirst, best, lowSecond }) {
            data.room(hotel, 1_000_000);
        }

        mvc.perform(search("da-lat", "2027-01-10", "2027-01-12", 2, 1))
                .andExpect(jsonPath("$.items[0].id").value(best))
                .andExpect(jsonPath("$.items[1].id").value(lowFirst))
                .andExpect(jsonPath("$.items[2].id").value(lowSecond));
    }

    @Test
    void searchAcceptsCheckInTodayAndThirtyNights() throws Exception {
        daLatHotels();

        mvc.perform(search("da-lat", "2026-11-25", "2026-12-25", 2, 1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].nights").value(30))
                .andExpect(jsonPath("$.items[0].totalPrice").value(24_000_000));
    }

    @Test
    void searchDefaultsToTwoGuestsAndOneRoom() throws Exception {
        long[] hotels = daLatHotels();

        mvc.perform(get("/hotels").param("destination", "da-lat").param("checkIn", "2027-01-10")
                .param("checkOut", "2027-01-12"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value(hotels[1]))
                .andExpect(jsonPath("$.items[0].rooms").value(1));
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            2026-11-24 | 2026-11-26 | 2 | 1 | checkIn  | Ngày nhận phòng không được ở quá khứ.
            2027-01-10 | 2027-01-10 | 2 | 1 | checkOut | Ngày trả phòng phải sau ngày nhận phòng.
            2027-01-10 | 2027-01-09 | 2 | 1 | checkOut | Ngày trả phòng phải sau ngày nhận phòng.
            2027-01-10 | 2027-02-10 | 2 | 1 | checkOut | Mỗi lần đặt tối đa 30 đêm.
            2027-01-10 | 2027-01-12 | 2 | 3 | rooms    | Số phòng không được nhiều hơn số khách.
            """)
    void searchRejectsInvalidStaysWithTheFieldAndMessage(String checkIn, String checkOut, int guests, int rooms,
            String field, String message) throws Exception {
        mvc.perform(search("da-lat", checkIn, checkOut, guests, rooms))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errors", hasSize(1)))
                .andExpect(jsonPath("$.errors[0].field").value(field))
                .andExpect(jsonPath("$.errors[0].message").value(message));
    }

    @ParameterizedTest
    @CsvSource({ "guests, 0", "guests, 31", "guests, abc", "rooms, 0", "rooms, 11", "rooms, abc",
            "checkIn, 10/01/2027", "checkIn, 2027-13-01", "checkOut, abc" })
    void searchRejectsOutOfRangeOrMalformedParameters(String name, String value) throws Exception {
        // Ghi đè (không thêm) một tham số của lượt tìm hợp lệ: `param()` của MockMvc cộng dồn nhiều giá trị.
        Map<String, String> params = new LinkedHashMap<>(Map.of("destination", "da-lat", "checkIn", "2027-01-10",
                "checkOut", "2027-01-12", "guests", "2", "rooms", "1"));
        params.put(name, value);
        MockHttpServletRequestBuilder request = get("/hotels");
        params.forEach(request::param);

        mvc.perform(request)
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.errors[0].field").value(name))
                .andExpect(jsonPath("$.errors[0].message").isNotEmpty());
    }

    @ParameterizedTest
    @ValueSource(strings = { "destination", "checkIn", "checkOut" })
    void searchRequiresTheDestinationAndBothDates(String missing) throws Exception {
        MockHttpServletRequestBuilder withoutIt = get("/hotels");
        Map<String, String> params = Map.of("destination", "da-lat", "checkIn", "2027-01-10", "checkOut", "2027-01-12");
        params.forEach((name, value) -> {
            if (!name.equals(missing)) {
                withoutIt.param(name, value);
            }
        });

        mvc.perform(withoutIt)
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.errors[0].field").value(missing))
                .andExpect(jsonPath("$.errors[0].message").isNotEmpty());
    }

    @Test
    void searchRejectsABlankDestination() throws Exception {
        mvc.perform(search("   ", "2027-01-10", "2027-01-12", 2, 1))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("destination"));
    }

    // ------------------------------------------------------------------------------------------------------------
    // GET /hotels/{slug}
    // ------------------------------------------------------------------------------------------------------------

    @Test
    void detailHasDescriptionAmenitiesTimesAndRoomTypesSortedByPrice() throws Exception {
        long destination = data.destination("da-lat", "Đà Lạt");
        long hotel = data.hotel("doi-may", destination, "ACTIVE", 4.6, 1280);
        data.hotelDetails(hotel, "Khách sạn nhìn ra đồi thông", List.of("Hồ bơi", "Bữa sáng", "Wi-Fi"), "15:00", "11:30");
        // Chèn không theo thứ tự giá: API phải sắp tăng dần (hoà giá thì theo id).
        long expensive = data.room(hotel, "Phòng gia đình", 1_980_000, 4);
        long cheapB = data.room(hotel, "Phòng B", 1_250_000, 2);
        long cheapA = data.room(hotel, "Phòng A", 1_250_000, 3);

        mvc.perform(get("/hotels/doi-may"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(hotel))
                .andExpect(jsonPath("$.slug").value("doi-may"))
                .andExpect(jsonPath("$.destinationName").value("Đà Lạt"))
                .andExpect(jsonPath("$.destinationSlug").value("da-lat"))
                .andExpect(jsonPath("$.rating").value(4.6))
                .andExpect(jsonPath("$.minPricePerNight").value(1_250_000))
                .andExpect(jsonPath("$.description").value("Khách sạn nhìn ra đồi thông"))
                .andExpect(jsonPath("$.amenities", contains("Hồ bơi", "Bữa sáng", "Wi-Fi")))
                // Giờ là chuỗi "HH:mm" (không phải "15:00:00") để web in nguyên.
                .andExpect(jsonPath("$.checkInTime").value("15:00"))
                .andExpect(jsonPath("$.checkOutTime").value("11:30"))
                .andExpect(jsonPath("$.roomTypes", hasSize(3)))
                .andExpect(jsonPath("$.roomTypes[0].id").value(cheapB))
                .andExpect(jsonPath("$.roomTypes[1].id").value(cheapA))
                .andExpect(jsonPath("$.roomTypes[2].id").value(expensive))
                .andExpect(jsonPath("$.roomTypes[2].name").value("Phòng gia đình"))
                .andExpect(jsonPath("$.roomTypes[2].maxGuests").value(4))
                .andExpect(jsonPath("$.roomTypes[2].bedType").value("1 giường đôi"))
                .andExpect(jsonPath("$.roomTypes[2].areaM2").value(25))
                .andExpect(jsonPath("$.roomTypes[2].pricePerNight").value(1_980_000));
    }

    @Test
    void detailUsesTheDefaultCheckInAndCheckOutTimesOfTheTable() throws Exception {
        long destination = data.destination("da-lat", "Đà Lạt");
        long hotel = data.hotel("mac-dinh", destination, "ACTIVE", 4.0, 1);
        data.room(hotel, 1_000_000);

        mvc.perform(get("/hotels/mac-dinh"))
                .andExpect(jsonPath("$.checkInTime").value("14:00"))
                .andExpect(jsonPath("$.checkOutTime").value("12:00"));
    }

    @Test
    void detailIsNotFoundForAnUnknownSlugAHiddenHotelAndAHotelWithoutRooms() throws Exception {
        long destination = data.destination("da-lat", "Đà Lạt");
        long hidden = data.hotel("bi-an", destination, "HIDDEN", 4.0, 1);
        data.room(hidden, 1_000_000);
        data.hotel("chua-co-phong", destination, "ACTIVE", 4.0, 1);

        for (String slug : new String[] { "khong-ton-tai", "bi-an", "chua-co-phong" }) {
            mvc.perform(get("/hotels/" + slug))
                    .andExpect(status().isNotFound())
                    .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                    .andExpect(jsonPath("$.status").value(404))
                    // Cùng một thông điệp cho cả ba: không lộ khách sạn đang ẩn.
                    .andExpect(jsonPath("$.detail").value("Không tìm thấy khách sạn này."));
        }
    }
}
