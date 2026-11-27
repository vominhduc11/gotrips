package com.gotrips.gotrips_api.hotel;

import static com.gotrips.gotrips_api.support.BookingTestClient.code;
import static com.gotrips.gotrips_api.support.BookingTestClient.hotelBooking;
import static com.gotrips.gotrips_api.support.HotelRequests.id;
import static com.gotrips.gotrips_api.support.HotelRequests.image;
import static com.gotrips.gotrips_api.support.HotelRequests.json;
import static com.gotrips.gotrips_api.support.HotelRequests.photo;
import static com.gotrips.gotrips_api.support.HotelRequests.room;
import static com.gotrips.gotrips_api.support.HotelRequests.with;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.sql.Date;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.test.web.servlet.ResultActions;

import com.gotrips.gotrips_api.support.AdminCatalogApiTest;
import com.gotrips.gotrips_api.support.BookingTestClient.Account;

/** "Hôm nay" của test là 25/11/2026 (giờ Việt Nam, xem {@code TestcontainersConfiguration}). */
class AdminRoomTypeControllerTests extends AdminCatalogApiTest {

    private long hotel;
    private Account customer;

    @BeforeEach
    void setUpCatalog() throws Exception {
        long destination = data.destination("da-lat", "Đà Lạt");
        hotel = data.hotel("khach-san-a", destination, "ACTIVE", 4.5, 10);
        data.amenity("pool", "Hồ bơi", "HOTEL", 10);
        data.amenity("wifi", "Wi-Fi", "BOTH", 80);
        data.amenity("tv", "TV", "ROOM", 180);
        data.amenity("safe", "Két an toàn", "ROOM", 230);
        customer = client.customer();
        newRequestBoundary();
    }

    private ResultActions create(Map<String, Object> body) throws Exception {
        return adminPost("/admin/hotels/" + hotel + "/room-types", json(body));
    }

    private long createRoom(String name, int totalRooms) throws Exception {
        return id(create(room(name, totalRooms)).andExpect(status().isCreated()));
    }

    private ResultActions update(long roomType, Map<String, Object> body) throws Exception {
        return adminPut("/admin/room-types/" + roomType, json(body));
    }

    private ResultActions setTotalRooms(long roomType, int totalRooms) throws Exception {
        return update(roomType, room("Phòng Deluxe", totalRooms));
    }

    /** Đặt {@code rooms} phòng qua API thật (mỗi phòng một khách). */
    private String book(long roomType, String checkIn, String checkOut, int rooms) throws Exception {
        return code(postAs("/bookings/hotels", customer, hotelBooking(roomType, checkIn, checkOut, rooms, rooms))
                .andExpect(status().isCreated()));
    }

    /** API không đặt được ngày đã qua nên dời kỳ lưu trú của một đơn thật bằng SQL. */
    private void moveStay(String bookingCode, String checkIn, String checkOut) {
        jdbc.update("UPDATE hotel_bookings SET check_in = ?, check_out = ? "
                + "WHERE booking_id = (SELECT id FROM bookings WHERE code = ?)",
                Date.valueOf(LocalDate.parse(checkIn)), Date.valueOf(LocalDate.parse(checkOut)), bookingCode);
        newRequestBoundary();
    }

    private void expectMinimum(long roomType, int minimum) throws Exception {
        adminGet("/admin/hotels/" + hotel + "/room-types")
                .andExpect(jsonPath("$[?(@.id==" + roomType + ")].minimumTotalRooms", contains(minimum)));
    }

    private void expectCannotLowerBelow(long roomType, int minimum) throws Exception {
        setTotalRooms(roomType, minimum - 1)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors[0].field").value("totalRooms"))
                .andExpect(jsonPath("$.detail", containsString("tối thiểu là " + minimum + ".")));
        setTotalRooms(roomType, minimum).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRooms").value(minimum));
    }

    private int storedTotal(long roomType) {
        return count("SELECT total_rooms FROM hotel_room_types WHERE id = ?", roomType);
    }

    // ---- Tạo, đọc, sửa ----

    @Test
    void createReturnsEveryFieldAndTheListIsSortedByPrice() throws Exception {
        long suite = id(create(with(with(with(room("Suite", 2), "pricePerNight", 2_000_000), "amenityCodes",
                List.of("safe", "wifi", "tv", "wifi")), "images", List.of(image("giuong"), image("tam"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.hotelId").value(hotel))
                .andExpect(jsonPath("$.name").value("Suite"))
                .andExpect(jsonPath("$.pricePerNight").value(2_000_000))
                .andExpect(jsonPath("$.maxGuests").value(2))
                .andExpect(jsonPath("$.bedType").value("1 giường đôi"))
                .andExpect(jsonPath("$.areaM2").value(24))
                .andExpect(jsonPath("$.totalRooms").value(2))
                .andExpect(jsonPath("$.minimumTotalRooms").value(0))
                .andExpect(jsonPath("$.deletable").value(true))
                .andExpect(jsonPath("$.amenities[*].code", contains("wifi", "tv", "safe")))
                .andExpect(jsonPath("$.images[*].url", contains(photo("giuong"), photo("tam")))));
        long standard = createRoom("Standard", 5);

        adminGet("/admin/hotels/" + hotel + "/room-types")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", contains((int) standard, (int) suite)))
                .andExpect(jsonPath("$[1].images", hasSize(2)))
                .andExpect(jsonPath("$[0].images", empty()));
        mvc.perform(get("/hotels/khach-san-a"))
                .andExpect(jsonPath("$.roomTypes[1].amenities[*].code", contains("wifi", "tv", "safe")))
                .andExpect(jsonPath("$.roomTypes[1].images[1].alt").value("Ảnh tam"))
                .andExpect(jsonPath("$.minPricePerNight").value(900_000));
        assertThat(hotelEvents()).isEqualTo(2);
    }

    @Test
    void updateReplacesAmenitiesAndImagesAndLeavesTheOtherRoomTypesAlone() throws Exception {
        Map<String, Object> body = with(with(room("Phòng Deluxe", 3), "amenityCodes", List.of("tv", "wifi")),
                "images", List.of(image("a"), image("b")));
        long first = id(create(body).andExpect(status().isCreated()));
        long second = id(create(with(body, "name", "Phòng khác")).andExpect(status().isCreated()));

        update(first, body).andExpect(status().isOk())
                .andExpect(jsonPath("$.amenities[*].code", contains("wifi", "tv")))
                .andExpect(jsonPath("$.images[*].url", contains(photo("a"), photo("b"))));
        update(first, with(with(with(body, "amenityCodes", List.of("safe")), "images",
                List.of(image("b"), image("a"))), "pricePerNight", 1_100_000))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pricePerNight").value(1_100_000))
                .andExpect(jsonPath("$.amenities[*].code", contains("safe")))
                .andExpect(jsonPath("$.images[*].url", contains(photo("b"), photo("a"))));
        update(first, with(with(body, "amenityCodes", List.of()), "images", List.of()))
                .andExpect(jsonPath("$.amenities", empty()))
                .andExpect(jsonPath("$.images", empty()));

        assertThat(count("SELECT count(*) FROM hotel_room_type_images WHERE room_type_id = ?", first)).isZero();
        assertThat(count("SELECT count(*) FROM hotel_room_type_amenities WHERE room_type_id = ?", first)).isZero();
        assertThat(count("SELECT count(*) FROM hotel_room_type_images WHERE room_type_id = ?", second)).isEqualTo(2);
        assertThat(count("SELECT count(*) FROM hotel_room_type_amenities WHERE room_type_id = ?", second))
                .isEqualTo(2);
    }

    static Stream<Arguments> invalidFields() {
        return Stream.of(
                Arguments.of("name", " ", "name"),
                Arguments.of("name", "a".repeat(151), "name"),
                Arguments.of("pricePerNight", 0, "pricePerNight"),
                Arguments.of("pricePerNight", 1_000_000_000_001L, "pricePerNight"),
                Arguments.of("pricePerNight", null, "pricePerNight"),
                Arguments.of("maxGuests", 0, "maxGuests"),
                Arguments.of("maxGuests", 31, "maxGuests"),
                Arguments.of("bedType", "", "bedType"),
                Arguments.of("areaM2", 0, "areaM2"),
                Arguments.of("areaM2", 10_001, "areaM2"),
                Arguments.of("totalRooms", -1, "totalRooms"),
                Arguments.of("totalRooms", 10_001, "totalRooms"),
                Arguments.of("totalRooms", null, "totalRooms"),
                Arguments.of("amenityCodes", List.of("pool"), "amenityCodes"),
                Arguments.of("amenityCodes", List.of("khong-co"), "amenityCodes"),
                Arguments.of("amenityCodes", null, "amenityCodes"),
                Arguments.of("images", null, "images"),
                Arguments.of("images", List.of(Map.of("url", "https://img.test/a.jpg", "alt", "A")),
                        "images[0].url"),
                Arguments.of("images", List.of(image("a"), image("a")), "images[1].url"));
    }

    @ParameterizedTest(name = "{0} = {1}")
    @MethodSource("invalidFields")
    void invalidInputIsRejectedOnTheRightField(String field, Object value, String errorField) throws Exception {
        create(with(room("Phòng", 1), field, value))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value(errorField));
        assertThat(count("SELECT count(*) FROM hotel_room_types")).isZero();
    }

    @Test
    void unknownRoomTypeIsNotFound() throws Exception {
        update(999_999, room("Phòng", 1)).andExpect(status().isNotFound());
        adminDelete("/admin/room-types/999999").andExpect(status().isNotFound());
    }

    @Test
    void aDeletedHotelOnlyAllowsReadingItsRoomTypes() throws Exception {
        long roomType = createRoom("Phòng Deluxe", 3);
        adminDelete("/admin/hotels/" + hotel).andExpect(status().isNoContent());

        create(room("Mới", 1)).andExpect(status().isConflict());
        setTotalRooms(roomType, 4).andExpect(status().isConflict());
        adminDelete("/admin/room-types/" + roomType).andExpect(status().isConflict());
        adminGet("/admin/hotels/" + hotel + "/room-types")
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].deletable").value(false));
        assertThat(storedTotal(roomType)).isEqualTo(3);
    }

    // ---- Giảm tổng số phòng: tính theo ĐÊM bị giữ nhiều nhất ----

    @Test
    void staysThatShareNoNightAreNotAddedTogether() throws Exception {
        long roomType = createRoom("Phòng Deluxe", 5);
        book(roomType, "2027-01-10", "2027-01-12", 2);
        book(roomType, "2027-01-20", "2027-01-22", 2);

        expectMinimum(roomType, 2);
        expectCannotLowerBelow(roomType, 2);

        // Tìm và đặt phòng GIỮ cách đếm cũ: kỳ hỏi đi qua cả hai đơn bị cộng 4 phòng, không còn phòng, không âm.
        String search = "/hotels?destination=da-lat&guests=1&rooms=1&checkIn=2027-01-10&checkOut=";
        mvc.perform(get(search + "2027-01-22")).andExpect(jsonPath("$.items", empty()));
        mvc.perform(get(search + "2027-01-12")).andExpect(jsonPath("$.items", empty()));
        mvc.perform(get("/hotels?destination=da-lat&guests=1&rooms=1&checkIn=2027-01-12&checkOut=2027-01-20"))
                .andExpect(jsonPath("$.items", hasSize(1)));
    }

    @Test
    void theBusiestNightDecidesWhenManyBookingsOverlap() throws Exception {
        long roomType = createRoom("Phòng Deluxe", 8);
        book(roomType, "2027-01-10", "2027-01-13", 2);
        book(roomType, "2027-01-12", "2027-01-14", 1);
        book(roomType, "2027-01-12", "2027-01-13", 1);
        book(roomType, "2027-01-13", "2027-01-14", 1);

        // Đêm 12/01 giữ 2 + 1 + 1 = 4; đêm 13/01 giữ 1 + 1 = 2.
        expectMinimum(roomType, 4);
        expectCannotLowerBelow(roomType, 4);
    }

    @Test
    void checkOutDayAndTheNextCheckInDoNotOverlap() throws Exception {
        long roomType = createRoom("Phòng Deluxe", 5);
        book(roomType, "2027-01-10", "2027-01-12", 2);
        book(roomType, "2027-01-12", "2027-01-14", 2);

        expectMinimum(roomType, 2);
        expectCannotLowerBelow(roomType, 2);
    }

    @Test
    void cancelledBookingsAreIgnoredWhilePendingAndConfirmedOnesAreCounted() throws Exception {
        long roomType = createRoom("Phòng Deluxe", 6);
        book(roomType, "2027-01-10", "2027-01-12", 1);
        String confirmed = book(roomType, "2027-01-10", "2027-01-12", 2);
        String cancelled = book(roomType, "2027-01-10", "2027-01-12", 3);
        adminPost("/admin/bookings/" + confirmed + "/mark-paid", "{}").andExpect(status().isOk());
        adminPost("/admin/bookings/" + confirmed + "/confirm", "{}").andExpect(status().isOk());
        adminPost("/admin/bookings/" + cancelled + "/cancel", "{}").andExpect(status().isOk());

        expectMinimum(roomType, 3);
        expectCannotLowerBelow(roomType, 3);
    }

    @Test
    void pastStaysAreIgnoredWhileAStayInProgressStillHoldsTonight() throws Exception {
        long roomType = createRoom("Phòng Deluxe", 8);
        String past = book(roomType, "2027-01-10", "2027-01-12", 3);
        String leavingToday = book(roomType, "2027-02-10", "2027-02-12", 2);
        String inHouse = book(roomType, "2027-03-10", "2027-03-12", 1);
        moveStay(past, "2026-11-01", "2026-11-05");
        moveStay(leavingToday, "2026-11-23", "2026-11-25");
        moveStay(inHouse, "2026-11-24", "2026-11-26");

        expectMinimum(roomType, 1);
        expectCannotLowerBelow(roomType, 1);
    }

    @Test
    void zeroIsAllowedOnlyWhenNothingHoldsARoom() throws Exception {
        long roomType = createRoom("Phòng Deluxe", 4);
        setTotalRooms(roomType, 0).andExpect(status().isOk()).andExpect(jsonPath("$.totalRooms").value(0));
    }

    /** Dữ liệu cũ có thể đã giữ nhiều hơn tổng số phòng: chỉ chặn việc GIẢM thêm. */
    @Test
    void onlyAReductionIsCheckedAgainstTheRoomsHeld() throws Exception {
        long roomType = createRoom("Phòng Deluxe", 5);
        book(roomType, "2027-01-10", "2027-01-12", 4);
        jdbc.update("UPDATE hotel_room_types SET total_rooms = 2 WHERE id = ?", roomType);
        newRequestBoundary();

        setTotalRooms(roomType, 2).andExpect(status().isOk());
        setTotalRooms(roomType, 3).andExpect(status().isOk());
        setTotalRooms(roomType, 2).andExpect(status().isConflict());
        assertThat(storedTotal(roomType)).isEqualTo(3);
    }

    // ---- Xoá loại phòng ----

    @Test
    void anUnusedRoomTypeIsDeletedWithItsImagesAndAmenities() throws Exception {
        long roomType = id(create(with(with(room("Phòng Deluxe", 3), "amenityCodes", List.of("tv")), "images",
                List.of(image("a")))).andExpect(status().isCreated()));

        adminDelete("/admin/room-types/" + roomType).andExpect(status().isNoContent());

        assertThat(count("SELECT count(*) FROM hotel_room_types")).isZero();
        assertThat(count("SELECT count(*) FROM hotel_room_type_images")).isZero();
        assertThat(count("SELECT count(*) FROM hotel_room_type_amenities")).isZero();
        // Hết loại phòng thì khách sạn đang hiện cũng biến khỏi website.
        mvc.perform(get("/hotels/khach-san-a")).andExpect(status().isNotFound());
        assertThat(hotelEvents()).isEqualTo(2);
    }

    @Test
    void aRoomTypeThatWasEverBookedCannotBeDeletedEvenIfThatBookingWasCancelledOrIsOver() throws Exception {
        long cancelledOnly = createRoom("Phòng đã huỷ", 3);
        long pastOnly = createRoom("Phòng đã ở", 3);
        String cancelled = book(cancelledOnly, "2027-01-10", "2027-01-12", 1);
        String past = book(pastOnly, "2027-01-10", "2027-01-12", 1);
        adminPost("/admin/bookings/" + cancelled + "/cancel", "{}").andExpect(status().isOk());
        moveStay(past, "2026-11-01", "2026-11-03");

        adminGet("/admin/hotels/" + hotel + "/room-types")
                .andExpect(jsonPath("$[*].deletable", contains(false, false)))
                .andExpect(jsonPath("$[*].minimumTotalRooms", contains(0, 0)));
        for (long roomType : List.of(cancelledOnly, pastOnly)) {
            adminDelete("/admin/room-types/" + roomType)
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.detail", containsString("đã có đơn đặt")));
        }
        assertThat(count("SELECT count(*) FROM hotel_room_types")).isEqualTo(2);
        getAs("/bookings/" + past, customer).andExpect(jsonPath("$.hotel.roomTypeName").value("Phòng đã ở"));
    }
}
