package com.gotrips.gotrips_api.booking;

import static com.gotrips.gotrips_api.support.BookingTestClient.code;
import static com.gotrips.gotrips_api.support.BookingTestClient.hotelBooking;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import com.gotrips.gotrips_api.support.BookingApiTest;
import com.gotrips.gotrips_api.support.BookingTestClient.Account;

/** POST /bookings/hotels và phòng trống ở GET /hotels. "Hôm nay" cố định là 25/11/2026. */
class HotelBookingControllerTests extends BookingApiTest {

    private static final String PATH = "/bookings/hotels";
    private static final String SEARCH = "/hotels?destination=da-lat&checkIn=%s&checkOut=%s&guests=%d&rooms=%d";

    private long hotelId;
    private long deluxe;
    private long family;

    @BeforeEach
    void createHotel() {
        long destination = data.destination("da-lat", "Đà Lạt");
        hotelId = data.hotel("khach-san-doi", destination, "ACTIVE", 4.6, 100);
        data.hotelDetails(hotelId, "Giới thiệu", "14:00", "11:30");
        deluxe = data.room(hotelId, "Phòng Deluxe", 1_250_000, 2);
        data.totalRooms(deluxe, 3);
        family = data.room(hotelId, "Phòng Gia đình", 1_980_000, 4);
        data.totalRooms(family, 1);
    }

    @Test
    void createsABookingWithNightsRoomsAndThePriceAtBookingTime() throws Exception {
        Account customer = client.customer();
        var result = postAs(PATH, customer, hotelBooking(deluxe, "2026-12-10", "2026-12-13", 3, 2))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.kind").value("HOTEL"))
                .andExpect(jsonPath("$.totalAmount").value(7_500_000)) // 1.250.000 × 3 đêm × 2 phòng
                .andExpect(jsonPath("$.hotel.hotelSlug").value("khach-san-doi"))
                .andExpect(jsonPath("$.hotel.hotelName").value("Khách sạn khach-san-doi"))
                .andExpect(jsonPath("$.hotel.destinationName").value("Đà Lạt"))
                .andExpect(jsonPath("$.hotel.roomTypeName").value("Phòng Deluxe"))
                .andExpect(jsonPath("$.hotel.checkInTime").value("14:00"))
                .andExpect(jsonPath("$.hotel.checkOutTime").value("11:30"))
                .andExpect(jsonPath("$.hotel.nights").value(3))
                .andExpect(jsonPath("$.hotel.rooms").value(2))
                .andExpect(jsonPath("$.hotel.guests").value(3))
                .andExpect(jsonPath("$.hotel.pricePerNight").value(1_250_000))
                .andExpect(jsonPath("$.hotel.guestName").value("Trần Văn Bình"))
                .andExpect(jsonPath("$.tour").doesNotExist())
                .andExpect(jsonPath("$.flight").doesNotExist());

        jdbc.update("UPDATE hotel_room_types SET price_per_night = 999000 WHERE id = ?", deluxe);
        newRequestBoundary();

        getAs("/bookings/" + code(result), customer)
                .andExpect(jsonPath("$.hotel.pricePerNight").value(1_250_000))
                .andExpect(jsonPath("$.totalAmount").value(7_500_000));
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            2026-11-24 | 2026-11-26 | 2 | 1 | checkIn  | Ngày nhận phòng không được ở quá khứ.
            2026-11-25 | 2026-11-27 | 2 | 1 | checkIn  | Đặt phòng trực tuyến chỉ nhận phòng từ ngày mai. Bạn vui lòng chọn ngày khác.
            2026-12-01 | 2026-12-01 | 2 | 1 | checkOut | Ngày trả phòng phải sau ngày nhận phòng.
            2026-12-01 | 2027-01-01 | 2 | 1 | checkOut | Mỗi lần đặt tối đa 30 đêm.
            2026-12-01 | 2026-12-03 | 1 | 2 | rooms    | Số phòng không được nhiều hơn số khách.
            2026-12-01 | 2026-12-03 | 3 | 1 | guests   | Loại phòng này ở tối đa 2 khách mỗi phòng. Bạn vui lòng tăng số phòng hoặc chọn loại phòng khác.
            """)
    void rejectsInvalidStaysWithTheFieldTheWebShows(String checkIn, String checkOut, int guests, int rooms,
            String field, String message) throws Exception {
        postAs(PATH, client.customer(), hotelBooking(deluxe, checkIn, checkOut, guests, rooms))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value(field))
                .andExpect(jsonPath("$.errors[0].message").value(message));
    }

    @Test
    void validatesTheBody() throws Exception {
        postAs(PATH, client.customer(), "{\"guests\":31,\"rooms\":11}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[*].field", containsInAnyOrder("roomTypeId", "checkIn", "checkOut",
                        "guests", "rooms", "contact", "guestName")));
    }

    @Test
    void rejectsUnknownRoomTypesAndHiddenHotels() throws Exception {
        long destination = data.destination("sapa", "Sapa");
        long hidden = data.hotel("khach-san-an", destination, "HIDDEN", 4.0, 1);
        long hiddenRoom = data.room(hidden, 500_000);
        Account customer = client.customer();

        postAs(PATH, customer, hotelBooking(999_999, "2026-12-10", "2026-12-11", 1, 1))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].message").value("Vui lòng chọn loại phòng."));
        postAs(PATH, customer, hotelBooking(hiddenRoom, "2026-12-10", "2026-12-11", 1, 1))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("roomTypeId"))
                .andExpect(jsonPath("$.errors[0].message").value("Khách sạn này hiện không nhận đặt phòng."));
    }

    @Test
    void countsOverlappingBookingsOnlyAndRejectsWithConflictWhenFull() throws Exception {
        Account customer = client.customer();
        // Giữ 2/3 phòng Deluxe cho [10/12, 13/12).
        postAs(PATH, customer, hotelBooking(deluxe, "2026-12-10", "2026-12-13", 4, 2)).andExpect(status().isCreated());

        postAs(PATH, customer, hotelBooking(deluxe, "2026-12-12", "2026-12-14", 4, 2))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors[0].field").value("rooms"))
                .andExpect(jsonPath("$.errors[0].message").value(
                        "Loại phòng này chỉ còn 1 phòng trống trong khoảng ngày đã chọn. "
                                + "Bạn vui lòng giảm số phòng, đổi ngày hoặc chọn loại phòng khác."));
        // Nhận đúng ngày đơn kia trả phòng (hoặc trả đúng ngày đơn kia nhận) thì không giao nhau.
        postAs(PATH, customer, hotelBooking(deluxe, "2026-12-13", "2026-12-15", 6, 3)).andExpect(status().isCreated());
        postAs(PATH, customer, hotelBooking(deluxe, "2026-12-08", "2026-12-10", 6, 3)).andExpect(status().isCreated());

        postAs(PATH, customer, hotelBooking(deluxe, "2026-12-10", "2026-12-11", 1, 1)).andExpect(status().isCreated());
        postAs(PATH, customer, hotelBooking(deluxe, "2026-12-10", "2026-12-11", 1, 1))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Loại phòng này đã hết phòng trong khoảng ngày đã chọn. "
                        + "Bạn vui lòng đổi ngày hoặc chọn loại phòng khác."));
    }

    @Test
    void searchOnlyOffersRoomTypesWithEnoughFreeRoomsForTheStay() throws Exception {
        Account customer = client.customer();
        postAs(PATH, customer, hotelBooking(deluxe, "2026-12-10", "2026-12-12", 6, 3)).andExpect(status().isCreated());

        // Deluxe hết phòng trong kỳ giao nhau → chọn loại đắt hơn; "giá từ" vẫn là phòng rẻ nhất.
        getAs(SEARCH.formatted("2026-12-11", "2026-12-12", 2, 1), null)
                .andExpect(jsonPath("$.items[0].room.name").value("Phòng Gia đình"))
                .andExpect(jsonPath("$.items[0].minPricePerNight").value(1_250_000));
        // Cần 2 phòng: phòng gia đình chỉ có 1 → không còn kết quả.
        getAs(SEARCH.formatted("2026-12-11", "2026-12-12", 2, 2), null)
                .andExpect(jsonPath("$.items", hasSize(0)));
        // Ngoài khoảng đã đặt thì Deluxe lại được chọn.
        getAs(SEARCH.formatted("2026-12-12", "2026-12-13", 2, 1), null)
                .andExpect(jsonPath("$.items[0].room.name").value("Phòng Deluxe"));
    }

    @Test
    void cancellingFreesTheRooms() throws Exception {
        Account customer = client.customer();
        String bookingCode = code(postAs(PATH, customer, hotelBooking(family, "2026-12-10", "2026-12-12", 4, 1))
                .andExpect(status().isCreated()));
        postAs(PATH, customer, hotelBooking(family, "2026-12-10", "2026-12-12", 4, 1)).andExpect(status().isConflict());

        postAs("/admin/bookings/" + bookingCode + "/cancel", client.staff(), "{}").andExpect(status().isOk());

        postAs(PATH, customer, hotelBooking(family, "2026-12-10", "2026-12-12", 4, 1)).andExpect(status().isCreated());
        assertThat(count("SELECT count(*) FROM hotel_bookings")).isEqualTo(2);
    }

    @Test
    void requiresAToken() throws Exception {
        postAs(PATH, null, hotelBooking(deluxe, "2026-12-10", "2026-12-11", 1, 1))
                .andExpect(status().isUnauthorized());
    }
}
