package com.gotrips.gotrips_api.flight;

import static com.gotrips.gotrips_api.flight.AdminFlightCatalogTests.SCHEDULES;
import static com.gotrips.gotrips_api.flight.AdminFlightCatalogTests.scheduleChanges;
import static com.gotrips.gotrips_api.support.BookingTestClient.adults;
import static com.gotrips.gotrips_api.support.BookingTestClient.code;
import static com.gotrips.gotrips_api.support.BookingTestClient.flightBooking;
import static com.gotrips.gotrips_api.support.BookingTestClient.passenger;
import static com.gotrips.gotrips_api.support.BookingTestClient.passengers;
import static com.gotrips.gotrips_api.support.HotelRequests.json;
import static com.gotrips.gotrips_api.support.HotelRequests.with;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.test.web.servlet.ResultActions;

import com.gotrips.gotrips_api.support.AdminCatalogApiTest;
import com.gotrips.gotrips_api.support.BookingTestClient.Account;

class AdminFlightCapacityTests extends AdminCatalogApiTest {

    private long schedule;
    private Account customer;

    @BeforeEach
    void prepareSchedule() throws Exception {
        data.airport("SGN", "Tân Sơn Nhất", "TP. Hồ Chí Minh", 1);
        data.airport("HAN", "Nội Bài", "Hà Nội", 2);
        data.airline("SV", "Hãng Sóng Việt");
        schedule = data.schedule("SV", "SV100", "SGN", "HAN", "23:30", 100, 1_250_000);
        customer = client.customer();
    }

    @Test
    void seatMinimumIsThePeakOfOneDayAndExcludesInfantsCancellationsAndThePast() throws Exception {
        String family = passengers(passenger("ADULT", "Nguyễn Minh Anh", null),
                passenger("CHILD", "Nguyễn Bảo Châu", "2020-03-01"),
                passenger("INFANT", "Nguyễn Bảo An", "2026-10-01"));
        book("2027-01-01", "ECONOMY", family);
        book("2027-01-01", "ECONOMY", adults(1));
        book("2027-01-02", "ECONOMY", adults(2));
        String cancelled = book("2027-01-01", "ECONOMY", adults(7));
        jdbc.update("UPDATE bookings SET status = 'CANCELLED' WHERE code = ?", cancelled);
        String past = book("2027-01-03", "ECONOMY", adults(8));
        moveDay(past, "2026-11-24");

        requireMinimum("economySeats", 2, 3);
        update("economySeats", 3).andExpect(status().isOk()).andExpect(jsonPath("$.economySeats").value(3));
    }

    @Test
    void minimumIncludesTodayButDoesNotPreventAnIncrease() throws Exception {
        String today = book("2027-01-01", "ECONOMY", adults(4));
        moveDay(today, "2026-11-25");
        requireMinimum("economySeats", 3, 4);
        update("economySeats", 4).andExpect(status().isOk());
        update("economySeats", 5).andExpect(status().isOk());
    }

    @ParameterizedTest
    @CsvSource({ "PREMIUM_ECONOMY,premiumEconomySeats", "BUSINESS,businessSeats", "FIRST,firstSeats" })
    void seatMinimumAppliesOnlyToTheReducedCabin(String cabin, String field) throws Exception {
        book("2027-01-01", cabin, adults(2));
        update("economySeats", 0).andExpect(status().isOk());
        requireMinimum(field, 1, 2);
        update(field, 2).andExpect(status().isOk()).andExpect(jsonPath("$." + field).value(2));
    }

    @Test
    void cancelledOrPastOrdersStillLockScheduleTimesAndDeletion() throws Exception {
        String old = book("2027-01-01", "ECONOMY", adults(1));
        moveDay(old, "2026-11-24");
        jdbc.update("UPDATE bookings SET status = 'CANCELLED' WHERE code = ?", old);

        adminGet(SCHEDULES + "/" + schedule).andExpect(jsonPath("$.timingEditable").value(false))
                .andExpect(jsonPath("$.deletable").value(false));
        adminGet(SCHEDULES).andExpect(jsonPath("$.items[0].timingEditable").value(false))
                .andExpect(jsonPath("$.items[0].deletable").value(false));
        update("departTime", "18:30").andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors[0].field").value("departTime"));
        update("durationMinutes", 101).andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors[0].field").value("durationMinutes"));
        adminDelete(SCHEDULES + "/" + schedule).andExpect(status().isConflict());
        update("economySeats", 0).andExpect(status().isOk());
    }

    @Test
    void priceIsFrozenButNamesAndRouteImageFollowTheCatalog() throws Exception {
        data.airport("DAD", "Đà Nẵng", "Đà Nẵng", 3);
        long first = data.route("SGN", "HAN", 1);
        long second = data.route("DAD", "HAN", 2);
        String old = book("2027-01-01", "ECONOMY", adults(1));
        String path = "/bookings/" + old;
        getAs(path, customer).andExpect(jsonPath("$.flight.imageUrl").value("https://img.test/SGNHAN.jpg"));

        update("economyFare", 2_000_000).andExpect(status().isOk());
        adminPut("/admin/airlines/SV", json(Map.of("name", "Tên hãng mới"))).andExpect(status().isOk());
        adminPut("/admin/airports/HAN", json(Map.of("name", "Sân bay mới", "city", "Hà Nội", "sortOrder", 1)))
                .andExpect(status().isOk());
        adminPut("/admin/flight-routes/order", json(Map.of("expectedIds", java.util.List.of(first, second),
                "orderedIds", java.util.List.of(second, first)))).andExpect(status().isOk());
        getAs(path, customer).andExpect(jsonPath("$.totalAmount").value(1_250_000))
                .andExpect(jsonPath("$.flight.segments[0].fares.adult").value(1_250_000))
                .andExpect(jsonPath("$.flight.segments[0].airline.name").value("Tên hãng mới"))
                .andExpect(jsonPath("$.flight.segments[0].to.name").value("Sân bay mới"))
                .andExpect(jsonPath("$.flight.imageUrl").value("https://img.test/DADHAN.jpg"));
        adminDelete("/admin/flight-routes/" + second).andExpect(status().isNoContent());
        adminDelete("/admin/flight-routes/" + first).andExpect(status().isNoContent());
        getAs(path, customer).andExpect(jsonPath("$.flight.imageUrl").value(org.hamcrest.Matchers.nullValue()));
    }

    private String book(String date, String cabin, String travelers) throws Exception {
        return code(postAs("/bookings/flights", customer, flightBooking(schedule, null, "SGN", "HAN", date,
                null, cabin, travelers)).andExpect(status().isCreated()));
    }

    private void moveDay(String booking, String date) {
        jdbc.update("UPDATE flight_booking_segments SET flight_date = CAST(? AS date) "
                + "WHERE booking_id = (SELECT id FROM bookings WHERE code = ?)", date, booking);
        newRequestBoundary();
    }

    private ResultActions update(String field, Object value) throws Exception {
        return adminPut(SCHEDULES + "/" + schedule, json(with(scheduleChanges(), field, value)));
    }

    private void requireMinimum(String field, int selected, int minimum) throws Exception {
        update(field, selected).andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors[0].field").value(field))
                .andExpect(jsonPath("$.errors[0].message").value(containsString("tối thiểu là " + minimum)));
    }
}
