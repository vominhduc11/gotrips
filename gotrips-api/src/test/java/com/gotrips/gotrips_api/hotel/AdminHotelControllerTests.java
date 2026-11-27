package com.gotrips.gotrips_api.hotel;

import static com.gotrips.gotrips_api.support.BookingTestClient.code;
import static com.gotrips.gotrips_api.support.BookingTestClient.hotelBooking;
import static com.gotrips.gotrips_api.support.HotelRequests.hotel;
import static com.gotrips.gotrips_api.support.HotelRequests.id;
import static com.gotrips.gotrips_api.support.HotelRequests.image;
import static com.gotrips.gotrips_api.support.HotelRequests.json;
import static com.gotrips.gotrips_api.support.HotelRequests.photo;
import static com.gotrips.gotrips_api.support.HotelRequests.room;
import static com.gotrips.gotrips_api.support.HotelRequests.with;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;
import java.util.stream.Stream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import com.gotrips.gotrips_api.support.AdminCatalogApiTest;
import com.gotrips.gotrips_api.support.BookingTestClient.Account;

import jakarta.servlet.http.Cookie;

class AdminHotelControllerTests extends AdminCatalogApiTest {

    private long destination;

    @BeforeEach
    void setUpCatalog() {
        destination = data.destination("da-lat", "Đà Lạt");
        data.amenity("pool", "Hồ bơi", "HOTEL", 10);
        data.amenity("spa", "Spa", "HOTEL", 30);
        data.amenity("wifi", "Wi-Fi", "BOTH", 80);
        data.amenity("tv", "TV", "ROOM", 180);
        newRequestBoundary();
    }

    private Map<String, Object> valid(String slug) {
        return hotel(slug, destination);
    }

    private ResultActions create(Map<String, Object> body) throws Exception {
        return adminPost("/admin/hotels", json(body));
    }

    private long createHotel(String slug) throws Exception {
        return id(create(valid(slug)).andExpect(status().isCreated()));
    }

    private ResultActions update(long id, Map<String, Object> body) throws Exception {
        return adminPut("/admin/hotels/" + id, json(body));
    }

    private ResultActions setStatus(long id, String value) throws Exception {
        return adminPatch("/admin/hotels/" + id + "/status", "{\"status\":\"" + value + "\"}");
    }

    private List<String> amenityCodes(long hotelId) {
        return jdbc.queryForList("SELECT a.code FROM hotel_amenities l JOIN amenities a ON a.id = l.amenity_id "
                + "WHERE l.hotel_id = ? ORDER BY a.sort_order", String.class, hotelId);
    }

    /** "sort_order:url:alt" theo thứ tự hiển thị. */
    private List<String> gallery(long hotelId) {
        return jdbc.queryForList("SELECT sort_order || ':' || image_url || ':' || image_alt FROM hotel_images "
                + "WHERE hotel_id = ? ORDER BY sort_order", String.class, hotelId);
    }

    private static String stored(int order, String name) {
        return order + ":" + photo(name) + ":Ảnh " + name;
    }

    private void expectOnWebsite(String slug, boolean visible) throws Exception {
        int expected = visible ? 1 : 0;
        String bySlug = "[?(@.slug=='" + slug + "')]";
        mvc.perform(get("/hotels/featured?limit=50")).andExpect(jsonPath("$" + bySlug, hasSize(expected)));
        mvc.perform(get("/hotels?destination=da-lat&checkIn=2027-01-10&checkOut=2027-01-12"))
                .andExpect(jsonPath("$.items" + bySlug, hasSize(expected)));
        mvc.perform(get("/hotels/" + slug)).andExpect(visible ? status().isOk() : status().isNotFound());
    }

    // ---- Phân quyền ----

    @Test
    void adminDistinguishesTotalRoomTypesAndSellingRoomTypes() throws Exception {
        long place = data.destination("doi-may", "Đồi Mây");
        long id = data.hotel("doi-may", place, "ACTIVE", 4.5, 10);
        long stopped = data.room(id, 700_000);
        long selling = data.room(id, 1_100_000);
        data.totalRooms(stopped, 0);

        adminGet("/admin/hotels/" + id).andExpect(jsonPath("$.roomTypeCount").value(2))
                .andExpect(jsonPath("$.sellingRoomTypeCount").value(1))
                .andExpect(jsonPath("$.minPricePerNight").value(1_100_000))
                .andExpect(jsonPath("$.visibleOnWebsite").value(true));
        adminGet("/admin/hotels").andExpect(jsonPath("$.items[0].roomTypeCount").value(2))
                .andExpect(jsonPath("$.items[0].sellingRoomTypeCount").value(1))
                .andExpect(jsonPath("$.items[0].minPricePerNight").value(1_100_000));
        data.totalRooms(selling, 0);

        adminGet("/admin/hotels/" + id).andExpect(jsonPath("$.roomTypeCount").value(2))
                .andExpect(jsonPath("$.sellingRoomTypeCount").value(0))
                .andExpect(jsonPath("$.minPricePerNight").value(nullValue()))
                .andExpect(jsonPath("$.visibleOnWebsite").value(false));
        adminGet("/admin/hotels/" + id + "/room-types").andExpect(jsonPath("$.length()").value(2));

        data.totalRooms(stopped, 1);
        adminGet("/admin/hotels/" + id).andExpect(jsonPath("$.sellingRoomTypeCount").value(1))
                .andExpect(jsonPath("$.minPricePerNight").value(700_000))
                .andExpect(jsonPath("$.visibleOnWebsite").value(true));
    }

    @Test
    void onlyStaffAndAdminsMayUseTheHotelAdminApi() throws Exception {
        Account customer = client.customer();
        newRequestBoundary();
        for (String path : List.of("/admin/hotels", "/admin/hotels/1", "/admin/hotels/1/room-types",
                "/admin/amenities")) {
            mvc.perform(get(path)).andExpect(status().isUnauthorized());
            getAs(path, customer).andExpect(status().isForbidden());
        }
        postAs("/admin/hotels", customer, json(valid("khach-san-a"))).andExpect(status().isForbidden());
        postAs("/admin/hotels/1/room-types", customer, json(room("Phòng", 1))).andExpect(status().isForbidden());
        assertThat(count("SELECT count(*) FROM hotels")).isZero();
    }

    @Test
    void writesAuthenticatedByTheAdminCookieNeedTheCsrfToken() throws Exception {
        Cookie session = new Cookie("gotrips_admin_session", staff.token());
        Cookie csrf = mvc.perform(get("/admin/auth/me")).andReturn().getResponse().getCookie("XSRF-TOKEN");

        mvc.perform(post("/admin/hotels").cookie(session, csrf).contentType(MediaType.APPLICATION_JSON)
                .content(json(valid("khach-san-a")))).andExpect(status().isForbidden());
        assertThat(count("SELECT count(*) FROM hotels")).isZero();

        mvc.perform(post("/admin/hotels").cookie(session, csrf).header("X-XSRF-TOKEN", csrf.getValue())
                .contentType(MediaType.APPLICATION_JSON).content(json(valid("khach-san-a"))))
                .andExpect(status().isCreated());
    }

    // ---- Tạo ----

    @Test
    void createStoresEveryFieldAndStaysOffTheWebsiteUntilItHasARoom() throws Exception {
        Map<String, Object> body = with(with(valid("doi-thong"), "amenityCodes", List.of("wifi", " pool ", "wifi")),
                "images", List.of(image("sanh"), image("ho-boi")));

        ResultActions created = create(body)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.slug").value("doi-thong"))
                .andExpect(jsonPath("$.name").value("Khách sạn Đồi Thông"))
                .andExpect(jsonPath("$.destinationName").value("Đà Lạt"))
                .andExpect(jsonPath("$.starRating").value(4))
                .andExpect(jsonPath("$.area").value("Phường 3, Đà Lạt"))
                .andExpect(jsonPath("$.imageUrl").value(photo("dai-dien")))
                .andExpect(jsonPath("$.checkInTime").value("14:00"))
                .andExpect(jsonPath("$.checkOutTime").value("11:30"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.rating").value(0.0))
                .andExpect(jsonPath("$.reviewCount").value(0))
                .andExpect(jsonPath("$.roomTypeCount").value(0))
                .andExpect(jsonPath("$.minPricePerNight").value(nullValue()))
                .andExpect(jsonPath("$.visibleOnWebsite").value(false))
                // Tiện ích theo thứ tự danh mục, mã trùng đã được bỏ.
                .andExpect(jsonPath("$.amenities[*].code", contains("pool", "wifi")))
                .andExpect(jsonPath("$.images[*].url", contains(photo("sanh"), photo("ho-boi"))));
        long hotelId = id(created);

        assertThat(amenityCodes(hotelId)).containsExactly("pool", "wifi");
        assertThat(gallery(hotelId)).containsExactly(stored(0, "sanh"), stored(1, "ho-boi"));
        assertThat(jdbc.queryForObject("SELECT check_out_time::text FROM hotels WHERE id = ?", String.class, hotelId))
                .isEqualTo("11:30:00");
        expectOnWebsite("doi-thong", false);

        adminPost("/admin/hotels/" + hotelId + "/room-types", json(room("Phòng Deluxe", 5)))
                .andExpect(status().isCreated());

        expectOnWebsite("doi-thong", true);
        mvc.perform(get("/hotels/doi-thong"))
                .andExpect(jsonPath("$.amenities[*].code", contains("pool", "wifi")))
                .andExpect(jsonPath("$.images", hasSize(2)))
                .andExpect(jsonPath("$.minPricePerNight").value(900_000));
        adminGet("/admin/hotels/" + hotelId)
                .andExpect(jsonPath("$.roomTypeCount").value(1))
                .andExpect(jsonPath("$.minPricePerNight").value(900_000))
                .andExpect(jsonPath("$.visibleOnWebsite").value(true));
        assertThat(hotelEvents()).isEqualTo(2);
    }

    @Test
    void createMayStartHidden() throws Exception {
        create(with(valid("an-ngay"), "status", "HIDDEN"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("HIDDEN"));
    }

    static Stream<Arguments> invalidFields() {
        return Stream.of(
                Arguments.of("slug", "featured", "slug"),
                Arguments.of("slug", "Khách Sạn", "slug"),
                Arguments.of("slug", "a".repeat(151), "slug"),
                Arguments.of("name", "  ", "name"),
                Arguments.of("name", "a".repeat(201), "name"),
                Arguments.of("destinationId", null, "destinationId"),
                Arguments.of("destinationId", 999_999, "destinationId"),
                Arguments.of("starRating", 0, "starRating"),
                Arguments.of("starRating", 6, "starRating"),
                Arguments.of("area", "a".repeat(151), "area"),
                Arguments.of("imageUrl", "https://evil.example.com/photo-1", "imageUrl"),
                Arguments.of("imageUrl", "http://images.unsplash.com/photo-1", "imageUrl"),
                Arguments.of("imageAlt", "", "imageAlt"),
                Arguments.of("description", "", "description"),
                Arguments.of("description", "a".repeat(5001), "description"),
                Arguments.of("checkInTime", "25:00", "checkInTime"),
                Arguments.of("checkInTime", "9:00", "checkInTime"),
                Arguments.of("checkOutTime", "12:00:00", "checkOutTime"),
                Arguments.of("checkOutTime", null, "checkOutTime"),
                Arguments.of("amenityCodes", null, "amenityCodes"),
                Arguments.of("amenityCodes", List.of("khong-co"), "amenityCodes"),
                Arguments.of("amenityCodes", List.of("pool", "tv"), "amenityCodes"),
                Arguments.of("amenityCodes", List.of(" "), "amenityCodes[0]"),
                Arguments.of("amenityCodes",
                        IntStream.range(0, 31).mapToObj(i -> "ma-" + i).toList(), "amenityCodes"),
                Arguments.of("images", null, "images"),
                Arguments.of("images", Collections.singletonList(null), "images[0]"),
                Arguments.of("images", IntStream.range(0, 21).mapToObj(i -> image("anh-" + i)).toList(), "images"),
                Arguments.of("images", List.of(image("a"), Map.of("url", "https://img.test/b.jpg", "alt", "B")),
                        "images[1].url"),
                Arguments.of("images", List.of(Map.of("url", photo("a"), "alt", " ")), "images[0].alt"),
                Arguments.of("images", List.of(image("dai-dien")), "images[0].url"),
                Arguments.of("images", Arrays.asList(image("a"), image("b"), image("a")), "images[2].url"));
    }

    @ParameterizedTest(name = "{0} = {1}")
    @MethodSource("invalidFields")
    void invalidInputIsRejectedOnTheRightField(String field, Object value, String errorField) throws Exception {
        create(with(valid("khach-san-a"), field, value))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value(errorField))
                .andExpect(jsonPath("$.errors[0].message").isNotEmpty());
        assertThat(count("SELECT count(*) FROM hotels")).isZero();
        assertThat(hotelEvents()).isZero();
    }

    @Test
    void aSlugStaysReservedEvenWhenItsHotelIsDeleted() throws Exception {
        long first = createHotel("khach-san-a");
        long second = createHotel("khach-san-b");
        adminDelete("/admin/hotels/" + first).andExpect(status().isNoContent());

        create(valid("khach-san-a"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors[0].field").value("slug"));
        update(second, valid("khach-san-a"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors[0].field").value("slug"));
        // Giữ slug của chính mình thì được.
        update(second, valid("khach-san-b")).andExpect(status().isOk());
    }

    // ---- Sửa ----

    @Test
    void updateReplacesAmenitiesAndGalleryTogetherWithTheOtherFields() throws Exception {
        Map<String, Object> body = with(with(valid("khach-san-a"), "amenityCodes", List.of("pool", "wifi")), "images",
                List.of(image("a"), image("b")));
        long hotelId = id(create(body).andExpect(status().isCreated()));
        jdbc.update("UPDATE hotels SET rating = 4.7, review_count = 12 WHERE id = ?", hotelId);

        // Gửi lại đúng tiện ích và ảnh cũ: vẫn còn nguyên (không bị mất khi thay).
        update(hotelId, body).andExpect(status().isOk())
                .andExpect(jsonPath("$.amenities[*].code", contains("pool", "wifi")));
        assertThat(amenityCodes(hotelId)).containsExactly("pool", "wifi");
        assertThat(gallery(hotelId)).containsExactly(stored(0, "a"), stored(1, "b"));

        // Đổi thứ tự ảnh, đổi tiện ích, đồng thời đổi trường thường.
        Map<String, Object> changed = with(with(with(body, "amenityCodes", List.of("spa")), "images",
                List.of(image("b"), image("a"))), "name", "Tên mới");
        update(hotelId, changed).andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Tên mới"))
                .andExpect(jsonPath("$.rating").value(4.7))
                .andExpect(jsonPath("$.reviewCount").value(12));
        assertThat(jdbc.queryForObject("SELECT name FROM hotels WHERE id = ?", String.class, hotelId))
                .isEqualTo("Tên mới");
        assertThat(amenityCodes(hotelId)).containsExactly("spa");
        assertThat(gallery(hotelId)).containsExactly(stored(0, "b"), stored(1, "a"));

        update(hotelId, with(with(changed, "amenityCodes", List.of()), "images", List.of()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.amenities", empty()))
                .andExpect(jsonPath("$.images", empty()));
        assertThat(amenityCodes(hotelId)).isEmpty();
        assertThat(gallery(hotelId)).isEmpty();
        assertThat(count("SELECT count(*) FROM hotels WHERE id = ? AND rating = 4.7 AND review_count = 12", hotelId))
                .isEqualTo(1);
    }

    @Test
    void aRejectedUpdateChangesNothing() throws Exception {
        Map<String, Object> body = with(with(valid("khach-san-a"), "amenityCodes", List.of("pool")), "images",
                List.of(image("a")));
        long hotelId = id(create(body).andExpect(status().isCreated()));

        update(hotelId, with(with(body, "name", "Không được lưu"), "amenityCodes", List.of("tv")))
                .andExpect(status().isBadRequest());

        assertThat(jdbc.queryForObject("SELECT name FROM hotels WHERE id = ?", String.class, hotelId))
                .isEqualTo("Khách sạn Đồi Thông");
        assertThat(amenityCodes(hotelId)).containsExactly("pool");
        assertThat(gallery(hotelId)).containsExactly(stored(0, "a"));
    }

    // ---- Danh sách ----

    @Test
    void listFiltersSortsAndPagesInTheDatabase() throws Exception {
        long other = data.destination("sapa", "Sapa");
        long banMai = data.hotel("ban-mai", destination, "ACTIVE", 4.0, 1);
        long anNhien = data.hotel("an-nhien", destination, "HIDDEN", 4.0, 1);
        long cayThong = data.hotel("cay-thong", other, "ACTIVE", 4.0, 1);
        data.hotel("da-xoa", destination, "DELETED", 4.0, 1);
        data.room(banMai, 800_000);
        data.room(banMai, 600_000);
        data.room(anNhien, 700_000);
        newRequestBoundary();

        adminGet("/admin/hotels")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(3))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.items[*].slug", contains("cay-thong", "an-nhien", "ban-mai")))
                .andExpect(jsonPath("$.items[2].roomTypeCount").value(2))
                .andExpect(jsonPath("$.items[2].minPricePerNight").value(600_000))
                .andExpect(jsonPath("$.items[2].visibleOnWebsite").value(true))
                // Đang ẩn thì không hiện dù có phòng; chưa có phòng thì không hiện dù ACTIVE.
                .andExpect(jsonPath("$.items[1].visibleOnWebsite").value(false))
                .andExpect(jsonPath("$.items[0].roomTypeCount").value(0))
                .andExpect(jsonPath("$.items[0].minPricePerNight").value(nullValue()))
                .andExpect(jsonPath("$.items[0].visibleOnWebsite").value(false))
                .andExpect(jsonPath("$.items[0].destinationName").value("Sapa"));
        adminGet("/admin/hotels?status=DELETED").andExpect(jsonPath("$.items[*].slug", contains("da-xoa")));
        adminGet("/admin/hotels?status=HIDDEN").andExpect(jsonPath("$.items[*].slug", contains("an-nhien")));
        adminGet("/admin/hotels?destinationId=" + other)
                .andExpect(jsonPath("$.items[*].id", contains((int) cayThong)));
        adminGet("/admin/hotels?q=BAN-M").andExpect(jsonPath("$.items[*].slug", contains("ban-mai")));
        adminGet("/admin/hotels?q=%25").andExpect(jsonPath("$.totalItems").value(0));
        adminGet("/admin/hotels?q=_").andExpect(jsonPath("$.totalItems").value(0));
        adminGet("/admin/hotels?sort=OLDEST")
                .andExpect(jsonPath("$.items[*].slug", contains("ban-mai", "an-nhien", "cay-thong")));
        adminGet("/admin/hotels?sort=NAME_ASC")
                .andExpect(jsonPath("$.items[*].slug", contains("an-nhien", "ban-mai", "cay-thong")));
        adminGet("/admin/hotels?sort=NAME_DESC&size=2&page=2")
                .andExpect(jsonPath("$.items[*].slug", contains("an-nhien")))
                .andExpect(jsonPath("$.totalPages").value(2));
        adminGet("/admin/hotels?size=2&page=99")
                .andExpect(jsonPath("$.page").value(2))
                .andExpect(jsonPath("$.items", hasSize(1)));
        adminGet("/admin/hotels?q=khong-co-gi")
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.totalPages").value(1))
                .andExpect(jsonPath("$.items", empty()));
        adminGet("/admin/hotels?size=101").andExpect(status().isBadRequest());
        adminGet("/admin/hotels?sort=PRICE").andExpect(status().isBadRequest());
    }

    @Test
    void amenityCatalogIsListedInCatalogOrderWithItsScope() throws Exception {
        adminGet("/admin/amenities")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].code", contains("pool", "spa", "wifi", "tv")))
                .andExpect(jsonPath("$[*].scope", contains("HOTEL", "HOTEL", "BOTH", "ROOM")))
                .andExpect(jsonPath("$[2].name").value("Wi-Fi"));
    }

    // ---- Vòng đời ----

    @Test
    void hideDeleteAndRestoreControlTheWebsiteWhileOldBookingsStayUsable() throws Exception {
        long hotelId = createHotel("khach-san-a");
        long roomType = id(adminPost("/admin/hotels/" + hotelId + "/room-types", json(room("Phòng", 3)))
                .andExpect(status().isCreated()));
        Account customer = client.customer();
        newRequestBoundary();
        String bookingCode = code(postAs("/bookings/hotels", customer,
                hotelBooking(roomType, "2027-01-10", "2027-01-12", 2, 1)).andExpect(status().isCreated()));
        expectOnWebsite("khach-san-a", true);

        setStatus(hotelId, "HIDDEN").andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("HIDDEN"))
                .andExpect(jsonPath("$.visibleOnWebsite").value(false));
        expectOnWebsite("khach-san-a", false);
        postAs("/bookings/hotels", customer, hotelBooking(roomType, "2027-02-10", "2027-02-12", 2, 1))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("roomTypeId"));

        setStatus(hotelId, "ACTIVE").andExpect(status().isOk());
        expectOnWebsite("khach-san-a", true);

        adminDelete("/admin/hotels/" + hotelId).andExpect(status().isNoContent());
        expectOnWebsite("khach-san-a", false);
        adminGet("/admin/hotels").andExpect(jsonPath("$.totalItems").value(0));
        adminGet("/admin/hotels/" + hotelId)
                .andExpect(jsonPath("$.status").value("DELETED"))
                .andExpect(jsonPath("$.visibleOnWebsite").value(false));
        postAs("/bookings/hotels", customer, hotelBooking(roomType, "2027-02-10", "2027-02-12", 2, 1))
                .andExpect(status().isBadRequest());
        getAs("/bookings/" + bookingCode, customer)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hotel.hotelName").value("Khách sạn Đồi Thông"));
        adminGet("/admin/bookings/" + bookingCode).andExpect(jsonPath("$.hotel.hotelSlug").value("khach-san-a"));

        // Đã xoá thì chỉ xem và khôi phục.
        update(hotelId, valid("khach-san-a")).andExpect(status().isConflict());
        setStatus(hotelId, "ACTIVE").andExpect(status().isConflict());
        adminDelete("/admin/hotels/" + hotelId).andExpect(status().isConflict());

        adminPost("/admin/hotels/" + hotelId + "/restore", "{}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("HIDDEN"))
                .andExpect(jsonPath("$.roomTypeCount").value(1));
        expectOnWebsite("khach-san-a", false);
        adminPost("/admin/hotels/" + hotelId + "/restore", "{}").andExpect(status().isConflict());
        // Sáu thao tác thành công: tạo, thêm phòng, ẩn, hiện, xoá, khôi phục.
        assertThat(hotelEvents()).isEqualTo(6);

        setStatus(hotelId, "ACTIVE").andExpect(status().isOk());
        expectOnWebsite("khach-san-a", true);
        // Đơn cũ vẫn huỷ được.
        adminPost("/admin/bookings/" + bookingCode + "/cancel", "{}").andExpect(status().isOk());
    }

    @Test
    void unknownHotelIsNotFoundOnEveryOperation() throws Exception {
        adminGet("/admin/hotels/999999").andExpect(status().isNotFound());
        update(999_999, valid("khach-san-a")).andExpect(status().isNotFound());
        setStatus(999_999, "HIDDEN").andExpect(status().isNotFound());
        adminDelete("/admin/hotels/999999").andExpect(status().isNotFound());
        adminPost("/admin/hotels/999999/restore", "{}").andExpect(status().isNotFound());
        adminGet("/admin/hotels/999999/room-types").andExpect(status().isNotFound());
        adminPost("/admin/hotels/999999/room-types", json(room("Phòng", 1))).andExpect(status().isNotFound());
    }
}
