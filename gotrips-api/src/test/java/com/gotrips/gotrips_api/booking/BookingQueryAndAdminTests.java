package com.gotrips.gotrips_api.booking;

import static com.gotrips.gotrips_api.support.BookingTestClient.adults;
import static com.gotrips.gotrips_api.support.BookingTestClient.code;
import static com.gotrips.gotrips_api.support.BookingTestClient.flightBooking;
import static com.gotrips.gotrips_api.support.BookingTestClient.hotelBooking;
import static com.gotrips.gotrips_api.support.BookingTestClient.tourBooking;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.ResultActions;

import com.gotrips.gotrips_api.TestcontainersConfiguration;
import com.gotrips.gotrips_api.support.BookingApiTest;
import com.gotrips.gotrips_api.support.BookingTestClient.Account;

/** GET /bookings/me, GET /bookings/{code} và /admin/bookings/{code}/(mark-paid|confirm|cancel). */
class BookingQueryAndAdminTests extends BookingApiTest {

    private long departureId;
    private long roomTypeId;
    private long scheduleId;

    @BeforeEach
    void createCatalog() {
        long destination = data.destination("da-lat", "Đà Lạt");
        long tour = data.tour("da-lat-3n2d", destination, true, "ACTIVE");
        departureId = data.departure(tour, "2027-01-23", 3_490_000, null, 20, 5);
        long hotel = data.hotel("khach-san-doi", destination, "ACTIVE", 4.6, 100);
        roomTypeId = data.room(hotel, 1_250_000);
        data.airport("SGN", "Sân bay Tân Sơn Nhất", "TP. Hồ Chí Minh", 1);
        data.airport("HAN", "Sân bay Nội Bài", "Hà Nội", 2);
        data.airline("SV", "Sao Việt Air");
        scheduleId = data.schedule("SV", "SV201", "SGN", "HAN", "06:00", 125, 1_690_000);
    }

    private String bookTour(Account account) throws Exception {
        return code(postAs("/bookings/tours", account, tourBooking(departureId, 2)).andExpect(status().isCreated()));
    }

    private String bookHotel(Account account) throws Exception {
        return code(postAs("/bookings/hotels", account, hotelBooking(roomTypeId, "2026-12-10", "2026-12-12", 2, 1))
                .andExpect(status().isCreated()));
    }

    private String bookFlight(Account account) throws Exception {
        return code(postAs("/bookings/flights", account,
                flightBooking(scheduleId, null, "SGN", "HAN", "2027-06-10", null, "ECONOMY", adults(1)))
                .andExpect(status().isCreated()));
    }

    // ---- Đơn của tôi ----

    @Test
    void listsOnlyMyBookingsNewestFirstWithOneBlockEach() throws Exception {
        Account me = client.customer();
        String tour = bookTour(me);
        String hotel = bookHotel(me);
        String flight = bookFlight(me);
        bookTour(client.customer());

        getAs("/bookings/me", me)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                // Đồng hồ test cố định nên cùng thời điểm tạo: đơn tạo sau (id lớn hơn) đứng trước.
                .andExpect(jsonPath("$[*].code", contains(flight, hotel, tour)))
                .andExpect(jsonPath("$[*].kind", contains("FLIGHT", "HOTEL", "TOUR")))
                .andExpect(jsonPath("$[0].flight.segments[0].flightNumber").value("SV201"))
                .andExpect(jsonPath("$[0].tour").doesNotExist())
                .andExpect(jsonPath("$[0].hotel").doesNotExist())
                .andExpect(jsonPath("$[1].hotel.nights").value(2))
                .andExpect(jsonPath("$[1].flight").doesNotExist())
                .andExpect(jsonPath("$[2].tour.guests").value(2))
                .andExpect(jsonPath("$[2].tour.travelers", hasSize(2)))
                // Người liên hệ và thông tin chuyển khoản chỉ có ở trang chi tiết.
                .andExpect(jsonPath("$[0].contact").doesNotExist())
                .andExpect(jsonPath("$[0].bankTransfer").doesNotExist());
    }

    @Test
    void returnsAnEmptyListForANewAccount() throws Exception {
        getAs("/bookings/me", client.customer()).andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void stillShowsBookingsOfHiddenCatalogEntries() throws Exception {
        Account me = client.customer();
        bookTour(me);
        bookHotel(me);
        jdbc.update("UPDATE tours SET status = 'HIDDEN'");
        jdbc.update("UPDATE hotels SET status = 'HIDDEN'");
        newRequestBoundary();

        getAs("/bookings/me", me)
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].hotel.hotelSlug").value("khach-san-doi"))
                .andExpect(jsonPath("$[1].tour.tourSlug").value("da-lat-3n2d"));
    }

    @Test
    void someoneElsesCodeUnknownCodeAndBadFormatAreTheSame404() throws Exception {
        Account owner = client.customer();
        String ownedByOther = bookTour(owner);
        Account me = client.customer();

        for (String bookingCode : new String[] { ownedByOther, "GT222222", "khong-hop-le" }) {
            getAs("/bookings/" + bookingCode, me)
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.detail").value("Không tìm thấy đơn đặt chỗ."));
        }
        getAs("/bookings/" + ownedByOther, owner).andExpect(status().isOk());
    }

    @ParameterizedTest
    @ValueSource(strings = { "/bookings/me", "/bookings/GT222222" })
    void readingRequiresAToken(String path) throws Exception {
        getAs(path, null).andExpect(status().isUnauthorized());
    }

    // ---- Nhân viên ----

    private String adminPath(String bookingCode, String action) {
        return "/admin/bookings/" + bookingCode + "/" + action;
    }

    @Test
    void listsBookingsWithLiteralCaseInsensitiveContactSearchAndFilters() throws Exception {
        Account owner = client.customer();
        String tour = bookTour(owner);
        String hotel = bookHotel(owner);
        String flight = bookFlight(client.customer());
        Account staff = client.staff();
        postAs(adminPath(hotel, "mark-paid"), staff, "{}").andExpect(status().isOk());
        postAs(adminPath(hotel, "confirm"), staff, "{}").andExpect(status().isOk());

        adminList(staff, "q", tour.toLowerCase(java.util.Locale.ROOT))
                .andExpect(jsonPath("$.items[*].code", contains(tour)))
                .andExpect(jsonPath("$.items[0].contact.fullName").value("Nguyễn Minh Anh"))
                .andExpect(jsonPath("$.items[0].availableActions", contains("MARK_PAID", "CANCEL")));
        for (String text : new String[] { "MINHANH@EXAMPLE.COM", "MINH ANH", "234 567" }) {
            adminList(staff, "q", text).andExpect(jsonPath("$.totalItems").value(3));
        }
        adminList(staff, "q", "%").andExpect(jsonPath("$.totalItems").value(0));
        adminList(staff, "kind", "FLIGHT", "status", "PENDING", "paymentStatus", "UNPAID")
                .andExpect(jsonPath("$.items[*].code", contains(flight)));
        adminList(staff, "status", "CONFIRMED", "paymentStatus", "PAID")
                .andExpect(jsonPath("$.items[*].code", contains(hotel)))
                .andExpect(jsonPath("$.items[0].availableActions", contains("CANCEL")));
        UUID ownerId = jdbc.queryForObject("SELECT id FROM users WHERE email = ?", UUID.class, owner.email());
        adminList(staff, "customerId", ownerId.toString())
                .andExpect(jsonPath("$.items[*].code", contains(hotel, tour)))
                .andExpect(jsonPath("$.items[0].customerId").value(ownerId.toString()));
        getAs("/admin/bookings/" + hotel, staff)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.customer.id").value(ownerId.toString()))
                .andExpect(jsonPath("$.customer.email").value(owner.email()))
                .andExpect(jsonPath("$.customer.fullName").value("Minh Anh"))
                .andExpect(jsonPath("$.bankTransfer.content").value(hotel));
    }

    @Test
    void usesStableSqlOrderingAndClampsTheRequestedPage() throws Exception {
        Account owner = client.customer();
        String tour = bookTour(owner);
        String hotel = bookHotel(owner);
        String flight = bookFlight(owner);
        Account staff = client.staff();

        adminList(staff, "size", "2", "page", "2147483647")
                .andExpect(jsonPath("$.items[*].code", contains(tour)))
                .andExpect(jsonPath("$.page").value(2))
                .andExpect(jsonPath("$.size").value(2))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.totalItems").value(3));
        adminList(staff, "sort", "CREATED_ASC").andExpect(jsonPath("$.items[*].code", contains(tour, hotel, flight)));
        adminList(staff, "sort", "TOTAL_DESC").andExpect(jsonPath("$.items[*].code", contains(tour, hotel, flight)));
        adminList(staff, "sort", "TOTAL_ASC").andExpect(jsonPath("$.items[*].code", contains(flight, hotel, tour)));
        adminList(staff, "q", "khong-co", "page", "5")
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.totalPages").value(1))
                .andExpect(jsonPath("$.items").isEmpty());
    }

    @Test
    void comparesInclusiveCalendarDatesInVietnam() throws Exception {
        Account owner = client.customer();
        String late = bookTour(owner);
        String midnight = bookTour(owner);
        Account staff = client.staff();
        jdbc.update("UPDATE bookings SET created_at = ? WHERE code = ?",
                Timestamp.from(Instant.parse("2026-11-25T16:30:00Z")), late);
        jdbc.update("UPDATE bookings SET created_at = ? WHERE code = ?",
                Timestamp.from(Instant.parse("2026-11-25T17:00:00Z")), midnight);
        newRequestBoundary();
        adminList(staff, "createdFrom", "2026-11-25", "createdTo", "2026-11-25")
                .andExpect(jsonPath("$.items[*].code", contains(late)));
        adminList(staff, "createdFrom", "2026-11-26").andExpect(jsonPath("$.items[*].code", contains(midnight)));
        mvc.perform(get("/admin/bookings").header(HttpHeaders.AUTHORIZATION, "Bearer " + staff.token())
                .param("createdFrom", "2026-11-26").param("createdTo", "2026-11-25"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("createdTo"));
    }

    @ParameterizedTest
    @ValueSource(strings = { "/admin/bookings", "/admin/bookings/GT222222" })
    void adminListAndDetailRequireAnAuthorizedAccount(String path) throws Exception {
        getAs(path, null).andExpect(status().isUnauthorized());
        getAs(path, client.customer()).andExpect(status().isForbidden());
    }

    @Test
    void validatesPaginationSortAndInvalidDetailCodes() throws Exception {
        Account staff = client.staff();
        for (String[] parameter : new String[][] { {"size", "101"}, {"page", "0"}, {"sort", "invalid"} }) {
            mvc.perform(get("/admin/bookings").header(HttpHeaders.AUTHORIZATION, "Bearer " + staff.token())
                    .param(parameter[0], parameter[1]))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors[0].field").value(parameter[0]));
        }
        getAs("/admin/bookings/invalid", staff).andExpect(status().isNotFound());
        getAs("/admin/bookings/GT222222", staff).andExpect(status().isNotFound());
    }

    private ResultActions adminList(Account staff, String... filters) throws Exception {
        var request = get("/admin/bookings").header(HttpHeaders.AUTHORIZATION, "Bearer " + staff.token());
        for (int index = 0; index < filters.length; index += 2) {
            request.param(filters[index], filters[index + 1]);
        }
        return mvc.perform(request).andExpect(status().isOk());
    }

    @Test
    void marksPaidThenConfirmsThenCancelsKeepingThePaymentPaid() throws Exception {
        String bookingCode = bookTour(client.customer());
        Account staff = client.staff();

        postAs(adminPath(bookingCode, "confirm"), staff, "{}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail")
                        .value("Chỉ xác nhận được đơn đang chờ xác nhận và đã thanh toán."))
                .andExpect(jsonPath("$.errors").doesNotExist());

        postAs(adminPath(bookingCode, "mark-paid"), staff, "{}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentStatus").value("PAID"))
                .andExpect(jsonPath("$.paidAt").value(TestcontainersConfiguration.NOW.toString()))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.availableActions", contains("CONFIRM", "CANCEL")));
        postAs(adminPath(bookingCode, "mark-paid"), staff, "{}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(
                        "Chỉ đánh dấu đã thanh toán được cho đơn đang chờ xác nhận và chưa thanh toán."));

        postAs(adminPath(bookingCode, "confirm"), staff, "{}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.confirmedAt").value(TestcontainersConfiguration.NOW.toString()));

        postAs(adminPath(bookingCode, "cancel"), staff, "{}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.paymentStatus").value("PAID"))
                .andExpect(jsonPath("$.cancelledAt").value(TestcontainersConfiguration.NOW.toString()))
                .andExpect(jsonPath("$.availableActions").isEmpty());
    }

    @Test
    void cancellingAnUnpaidTourReleasesItsSeatsExactlyOnce() throws Exception {
        String bookingCode = bookTour(client.customer());
        Account staff = client.staff();
        assertThat(count("SELECT booked_seats FROM tour_departures WHERE id = ?", departureId)).isEqualTo(7);

        postAs(adminPath(bookingCode, "cancel"), staff, "{}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentStatus").value("CANCELLED"))
                .andExpect(jsonPath("$.paidAt").value(nullValue()));
        postAs(adminPath(bookingCode, "cancel"), staff, "{}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Đơn này đã huỷ trước đó."));

        assertThat(count("SELECT booked_seats FROM tour_departures WHERE id = ?", departureId)).isEqualTo(5);
    }

    @ParameterizedTest
    @ValueSource(strings = { "mark-paid", "confirm", "cancel" })
    void adminActionsNeedAStaffToken(String action) throws Exception {
        Account customer = client.customer();
        String bookingCode = bookTour(customer);

        postAs(adminPath(bookingCode, action), null, "{}").andExpect(status().isUnauthorized());
        postAs(adminPath(bookingCode, action), customer, "{}").andExpect(status().isForbidden());
        assertThat(count("SELECT count(*) FROM bookings WHERE status = 'PENDING'")).isEqualTo(1);
    }

    @ParameterizedTest
    @ValueSource(strings = { "GT222222", "khong-hop-le" })
    void adminActionOnAnUnknownCodeIs404(String bookingCode) throws Exception {
        postAs(adminPath(bookingCode, "cancel"), client.staff(), "{}").andExpect(status().isNotFound());
    }
}
