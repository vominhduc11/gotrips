package com.gotrips.gotrips_api.tour;

import static com.gotrips.gotrips_api.support.BookingTestClient.body;
import static com.gotrips.gotrips_api.support.BookingTestClient.code;
import static com.gotrips.gotrips_api.support.BookingTestClient.tourBooking;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.http.HttpMethod;

import com.gotrips.gotrips_api.support.AdminCatalogApiTest;
import com.gotrips.gotrips_api.support.BookingTestClient.Account;
import com.jayway.jsonpath.JsonPath;

/** Đồng hồ test: hôm nay là 25/11/2026 giờ Việt Nam. */
class AdminDepartureControllerTests extends AdminCatalogApiTest {

    private long tour;

    @BeforeEach
    void createTour() {
        tour = data.tour("tour-a", data.destination("da-lat", "Đà Lạt"), true, "ACTIVE");
    }

    private String listPath() {
        return "/admin/tours/" + tour + "/departures";
    }

    private static String path(long departure) {
        return "/admin/departures/" + departure;
    }

    private static String request(String date, long price, Long originalPrice, int totalSeats) {
        return """
                {"departureDate":"%s","price":%d,"originalPrice":%s,"totalSeats":%d}"""
                .formatted(date, price, originalPrice, totalSeats);
    }

    private long departure(String date, int total, int booked) {
        return data.departure(tour, date, 1_000_000, null, total, booked);
    }

    /** Đặt một chuyến qua API thật rồi huỷ: chuyến trả hết chỗ nhưng vẫn còn đơn tham chiếu. */
    private String bookThenCancel(long departure) throws Exception {
        Account customer = client.customer();
        newRequestBoundary();
        String bookingCode = code(postAs("/bookings/tours", customer, tourBooking(departure, 2)));
        adminPost("/admin/bookings/" + bookingCode + "/cancel", "{}").andExpect(status().isOk());
        return bookingCode;
    }

    private int bookedSeats(long departure) {
        return count("SELECT booked_seats FROM tour_departures WHERE id = ?", departure);
    }

    @Test
    void listShowsEveryDepartureWithStateAndFlagsComputedByTheApi() throws Exception {
        departure("2026-11-25", 10, 0);
        departure("2027-01-01", 10, 10);
        departure("2027-02-01", 10, 0);
        long cancelled = departure("2027-03-01", 10, 0);
        bookThenCancel(cancelled);

        adminGet(listPath())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(4)))
                .andExpect(jsonPath("$[0].state").value("PAST"))
                .andExpect(jsonPath("$[0].editable").value(false))
                .andExpect(jsonPath("$[0].deletable").value(true))
                .andExpect(jsonPath("$[1].state").value("SOLD_OUT"))
                .andExpect(jsonPath("$[1].editable").value(true))
                .andExpect(jsonPath("$[1].dateEditable").value(false))
                .andExpect(jsonPath("$[1].deletable").value(false))
                .andExpect(jsonPath("$[2].state").value("UPCOMING"))
                .andExpect(jsonPath("$[2].dateEditable").value(true))
                .andExpect(jsonPath("$[2].deletable").value(true))
                .andExpect(jsonPath("$[2].originalPrice").value(nullValue()))
                .andExpect(jsonPath("$[3].bookedSeats").value(0))
                .andExpect(jsonPath("$[3].dateEditable").value(false))
                .andExpect(jsonPath("$[3].deletable").value(false));
    }

    @Test
    void createdDepartureIsBookableOnTheWebsite() throws Exception {
        adminPost(listPath(), request("2026-11-26", 900_000, 1_000_000L, 12))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tourId").value(tour))
                .andExpect(jsonPath("$.discountPercent").value(10))
                .andExpect(jsonPath("$.remainingSeats").value(12))
                .andExpect(jsonPath("$.state").value("UPCOMING"));

        mvc.perform(get("/tours/tour-a")).andExpect(jsonPath("$.departures[0].seatsLeft").value(12));
        mvc.perform(get("/tours/featured")).andExpect(jsonPath("$[*].slug", hasItem("tour-a")));
        assertThat(catalogEvents()).isEqualTo(1);
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', nullValues = "-", value = {
            // ngày | giá | giá gốc | tổng chỗ | ô lỗi
            "2026-11-25 | 100 | - | 10 | departureDate",
            "2026-11-01 | 100 | - | 10 | departureDate",
            "+10000-01-01 | 100 | - | 10 | departureDate",
            "2027-01-01 | 0 | - | 10 | price",
            "2027-01-01 | 100 | 100 | 10 | originalPrice",
            "2027-01-01 | 100 | 99 | 10 | originalPrice",
            "2027-01-01 | 100 | - | 0 | totalSeats",
            "2027-01-01 | 100 | - | 10001 | totalSeats",
            "2027-01-01 | 1000000000001 | - | 10 | price" })
    void invalidDepartureIsRejectedOnItsField(String date, long price, Long originalPrice, int seats, String field)
            throws Exception {
        adminPost(listPath(), request(date, price, originalPrice, seats))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[*].field", hasItem(field)));

        assertThat(count("SELECT count(*) FROM tour_departures")).isZero();
        assertThat(catalogEvents()).isZero();
    }

    @Test
    void sameDateInTheSameTourIsAConflictButAnotherTourMayUseIt() throws Exception {
        long first = departure("2027-01-01", 10, 0);
        long second = departure("2027-02-01", 10, 0);
        long other = data.tour("tour-b", data.destination("sapa", "Sapa"), false, "ACTIVE");

        adminPost(listPath(), request("2027-01-01", 100, null, 10))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors[0].field").value("departureDate"));
        adminPut(path(second), request("2027-01-01", 100, null, 10))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors[0].field").value("departureDate"));
        adminPost("/admin/tours/" + other + "/departures", request("2027-01-01", 100, null, 10))
                .andExpect(status().isCreated());
        adminPut(path(first), request("2027-01-01", 100, null, 10)).andExpect(status().isOk());
    }

    @Test
    void untouchedDepartureCanMoveToAnotherFutureDate() throws Exception {
        long departure = departure("2027-01-01", 10, 0);

        adminPut(path(departure), request("2027-01-05", 500, 800L, 20))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.departureDate").value("2027-01-05"))
                .andExpect(jsonPath("$.price").value(500))
                .andExpect(jsonPath("$.originalPrice").value(800))
                .andExpect(jsonPath("$.totalSeats").value(20));
        adminPut(path(departure), request("2027-01-05", 500, null, 20))
                .andExpect(jsonPath("$.originalPrice").value(nullValue()));
        adminPut(path(departure), request("2026-11-25", 500, null, 20))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("departureDate"));
    }

    @Test
    void departureWithBookedSeatsKeepsItsDateButAllowsPriceAndSeatChanges() throws Exception {
        long departure = departure("2027-01-01", 10, 4);

        adminPut(path(departure), request("2027-01-02", 100, null, 10))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors[0].field").value("departureDate"));
        adminPut(path(departure), request("2027-01-01", 777, null, 4))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.state").value("SOLD_OUT"))
                .andExpect(jsonPath("$.bookedSeats").value(4));
    }

    /** Đơn đã huỷ không giữ chỗ nhưng vẫn đọc ngày khởi hành từ chuyến: đổi ngày hay xoá sẽ làm sai đơn cũ. */
    @Test
    void cancelledBookingStillPinsTheDepartureDate() throws Exception {
        long departure = departure("2027-01-01", 10, 0);
        bookThenCancel(departure);
        assertThat(bookedSeats(departure)).isZero();

        adminPut(path(departure), request("2027-01-02", 100, null, 10)).andExpect(status().isConflict());
        adminDelete(path(departure))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail", containsString("Đóng bán")));
        // Vẫn đóng bán được dù không còn chỗ nào đã đặt.
        adminPost(path(departure) + "/close", "{}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.state").value("CLOSED"));
    }

    @Test
    void totalSeatsCannotDropBelowBookedSeats() throws Exception {
        long departure = departure("2027-01-01", 10, 6);

        adminPut(path(departure), request("2027-01-01", 100, null, 5))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors[0].field").value("totalSeats"))
                .andExpect(jsonPath("$.detail", containsString("(6)")));

        assertThat(count("SELECT total_seats FROM tour_departures WHERE id = ?", departure)).isEqualTo(10);
        assertThat(catalogEvents()).isZero();
    }

    @Test
    void changingThePriceNeverChangesExistingBookingsAndBookedSeatsSurviveTheUpdate() throws Exception {
        long departure = departure("2027-01-01", 10, 0);
        Account customer = client.customer();
        newRequestBoundary();
        String bookingCode = code(postAs("/bookings/tours", customer, tourBooking(departure, 2)));

        adminPut(path(departure), request("2027-01-01", 5_000_000, null, 15))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookedSeats").value(2));

        assertThat(bookedSeats(departure)).isEqualTo(2);
        getAs("/bookings/" + bookingCode, customer)
                .andExpect(jsonPath("$.totalAmount").value(2_000_000))
                .andExpect(jsonPath("$.tour.unitPrice").value(1_000_000));
    }

    @Test
    void pastDepartureCannotBeEditedClosedOrReopened() throws Exception {
        long past = departure("2026-11-25", 10, 0);

        adminPut(path(past), request("2027-01-01", 100, null, 10)).andExpect(status().isConflict());
        adminPost(path(past) + "/close", "{}").andExpect(status().isConflict());
        adminPost(path(past) + "/reopen", "{}").andExpect(status().isConflict());
        // Chưa ai đặt thì dọn được.
        adminDelete(path(past)).andExpect(status().isNoContent());
    }

    @Test
    void onlyNeverBookedDeparturesCanBeDeleted() throws Exception {
        long untouched = departure("2027-01-01", 10, 0);
        long seeded = departure("2027-02-01", 10, 3);

        adminDelete(path(seeded)).andExpect(status().isConflict());
        adminDelete(path(untouched)).andExpect(status().isNoContent());
        adminDelete(path(untouched)).andExpect(status().isNotFound());

        assertThat(count("SELECT count(*) FROM tour_departures")).isEqualTo(1);
        assertThat(catalogEvents()).isEqualTo(1);
    }

    @Test
    void closedDepartureLooksSoldOutEverywhereAndStaysClosedWhenSeatsAreReturned() throws Exception {
        long departure = departure("2027-01-01", 10, 0);
        Account customer = client.customer();
        newRequestBoundary();
        String bookingCode = code(postAs("/bookings/tours", customer, tourBooking(departure, 3)));

        adminPost(path(departure) + "/close", "{}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.state").value("CLOSED"))
                .andExpect(jsonPath("$.totalSeats").value(10))
                .andExpect(jsonPath("$.remainingSeats").value(7));
        adminPost(path(departure) + "/close", "{}").andExpect(status().isConflict());

        mvc.perform(get("/tours/tour-a"))
                .andExpect(jsonPath("$.departures[0].isSoldOut").value(true))
                .andExpect(jsonPath("$.departures[0].seatsLeft").value(0))
                .andExpect(jsonPath("$.priceFrom").value(nullValue()));
        mvc.perform(get("/tours/featured")).andExpect(jsonPath("$", hasSize(0)));
        mvc.perform(get("/tours?date=2027-01-01")).andExpect(jsonPath("$.total").value(0));
        postAs("/bookings/tours", customer, tourBooking(departure, 1))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("departureId"))
                .andExpect(jsonPath("$.errors[0].message", containsString("đã đóng đặt chỗ")));

        // Huỷ đơn trả chỗ nhưng không mở bán lại.
        adminPost("/admin/bookings/" + bookingCode + "/cancel", "{}").andExpect(status().isOk());
        assertThat(bookedSeats(departure)).isZero();
        mvc.perform(get("/tours/tour-a")).andExpect(jsonPath("$.departures[0].isSoldOut").value(true));

        adminPost(path(departure) + "/reopen", "{}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.state").value("UPCOMING"));
        adminPost(path(departure) + "/reopen", "{}").andExpect(status().isConflict());
        mvc.perform(get("/tours/tour-a")).andExpect(jsonPath("$.departures[0].seatsLeft").value(10));
        postAs("/bookings/tours", customer, tourBooking(departure, 1)).andExpect(status().isCreated());
    }

    @Test
    void departuresOfADeletedTourAreReadOnly() throws Exception {
        long departure = departure("2027-01-01", 10, 0);
        adminDelete("/admin/tours/" + tour).andExpect(status().isNoContent());

        adminGet(listPath())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].editable").value(false))
                .andExpect(jsonPath("$[0].deletable").value(false));
        adminPost(listPath(), request("2027-03-01", 100, null, 10)).andExpect(status().isConflict());
        adminPut(path(departure), request("2027-01-01", 100, null, 10)).andExpect(status().isConflict());
        adminDelete(path(departure)).andExpect(status().isConflict());
        adminPost(path(departure) + "/close", "{}").andExpect(status().isConflict());
        adminPost(path(departure) + "/reopen", "{}").andExpect(status().isConflict());
    }

    @Test
    void everySuccessfulWriteRefreshesTheCache() throws Exception {
        String created = body(adminPost(listPath(), request("2027-01-01", 100, null, 10)));
        long departure = ((Number) JsonPath.read(created, "$.id")).longValue();
        adminPut(path(departure), request("2027-01-01", 200, null, 10)).andExpect(status().isOk());
        adminPost(path(departure) + "/close", "{}").andExpect(status().isOk());
        adminPost(path(departure) + "/reopen", "{}").andExpect(status().isOk());
        adminDelete(path(departure)).andExpect(status().isNoContent());

        assertThat(catalogEvents()).isEqualTo(5);
    }

    @Test
    void unknownIdsAreNotFound() throws Exception {
        adminGet("/admin/tours/999999/departures").andExpect(status().isNotFound());
        adminPost("/admin/tours/999999/departures", request("2027-01-01", 100, null, 10))
                .andExpect(status().isNotFound());
        adminPut(path(999999), request("2027-01-01", 100, null, 10)).andExpect(status().isNotFound());
        adminDelete(path(999999)).andExpect(status().isNotFound());
        adminPost(path(999999) + "/close", "{}").andExpect(status().isNotFound());
    }

    @ParameterizedTest
    @CsvSource({ "GET, /admin/tours/1/departures", "POST, /admin/tours/1/departures", "PUT, /admin/departures/1",
            "DELETE, /admin/departures/1", "POST, /admin/departures/1/close", "POST, /admin/departures/1/reopen" })
    void onlyStaffMayUseTheseEndpoints(String method, String adminPath) throws Exception {
        var customer = client.customer();
        newRequestBoundary();
        String json = request("2027-01-01", 100, null, 10);

        client.send(HttpMethod.valueOf(method), adminPath, null, json).andExpect(status().isUnauthorized());
        client.send(HttpMethod.valueOf(method), adminPath, customer.token(), json).andExpect(status().isForbidden());
    }
}
