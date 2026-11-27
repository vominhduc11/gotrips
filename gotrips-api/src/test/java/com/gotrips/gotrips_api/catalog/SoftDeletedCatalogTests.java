package com.gotrips.gotrips_api.catalog;

import static com.gotrips.gotrips_api.support.BookingTestClient.code;
import static com.gotrips.gotrips_api.support.BookingTestClient.hotelBooking;
import static com.gotrips.gotrips_api.support.BookingTestClient.tourBooking;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

import com.gotrips.gotrips_api.support.AdminCatalogApiTest;
import com.gotrips.gotrips_api.support.BookingTestClient.Account;

/** Xoá mềm: biến mất khỏi mọi API công khai, nhưng đơn đã đặt vẫn đọc và xử lý được. */
class SoftDeletedCatalogTests extends AdminCatalogApiTest {

    private void expectPublicTour(boolean visible) throws Exception {
        int expected = visible ? 1 : 0;
        mvc.perform(get("/tours")).andExpect(jsonPath("$.total").value(expected));
        mvc.perform(get("/tours?destination=da-lat")).andExpect(jsonPath("$.items", hasSize(expected)));
        mvc.perform(get("/tours/featured")).andExpect(jsonPath("$", hasSize(expected)));
        mvc.perform(get("/destinations")).andExpect(jsonPath("$[0].tourCount").value(expected));
        mvc.perform(get("/testimonials")).andExpect(jsonPath("$", hasSize(expected)));
        mvc.perform(get("/tours/tour-a")).andExpect(visible ? status().isOk() : status().isNotFound());
    }

    @Test
    void deletedTourLeavesEveryPublicApiWhileOldBookingsStayReadable() throws Exception {
        long destination = data.destination("da-lat", "Đà Lạt");
        long tour = data.tour("tour-a", destination, true, "ACTIVE");
        long departure = data.departure(tour, "2027-01-14", 1_000_000, null, 10, 0);
        data.testimonial(tour, "Minh Anh");
        Account customer = client.customer();
        newRequestBoundary();
        String bookingCode = code(postAs("/bookings/tours", customer, tourBooking(departure, 2)));
        expectPublicTour(true);

        adminDelete("/admin/tours/" + tour).andExpect(status().isNoContent());

        expectPublicTour(false);
        getAs("/bookings/" + bookingCode, customer)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tour.tourTitle").value("Tour tour-a"))
                .andExpect(jsonPath("$.tour.departureDate").value("2027-01-14"));
        getAs("/bookings/me", customer).andExpect(jsonPath("$", hasSize(1)));
        adminGet("/admin/bookings/" + bookingCode)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tour.tourSlug").value("tour-a"));
        adminGet("/admin/bookings").andExpect(jsonPath("$.items[0].tour.tourTitle").value("Tour tour-a"));
        // Không nhận đơn mới cho tour đã xoá (cùng câu trả lời như chuyến không tồn tại).
        postAs("/bookings/tours", customer, tourBooking(departure, 1))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("departureId"));
        // Đơn cũ vẫn huỷ được và trả chỗ.
        adminPost("/admin/bookings/" + bookingCode + "/cancel", "{}").andExpect(status().isOk());
        assertThat(count("SELECT booked_seats FROM tour_departures WHERE id = ?", departure)).isZero();

        // Khôi phục về ẩn: vẫn chưa hiện cho tới khi nhân viên cho hiện lại.
        adminPost("/admin/tours/" + tour + "/restore", "{}").andExpect(jsonPath("$.status").value("HIDDEN"));
        expectPublicTour(false);
        adminPatch("/admin/tours/" + tour + "/status", "{\"status\":\"ACTIVE\"}").andExpect(status().isOk());
        expectPublicTour(true);
    }

    /** Xoá qua API quản trị thật; khách sạn dựng bằng SQL nên không có tiện ích hay ảnh xem thêm. */
    @Test
    void deletedHotelLeavesEveryPublicApi() throws Exception {
        long destination = data.destination("da-lat", "Đà Lạt");
        long hotel = data.hotel("khach-san-a", destination, "ACTIVE", 4.5, 10);
        long room = data.room(hotel, 500_000);
        data.totalRooms(room, 3);
        Account customer = client.customer();
        newRequestBoundary();
        String bookingCode = code(postAs("/bookings/hotels", customer,
                hotelBooking(room, "2027-01-10", "2027-01-12", 2, 1)));

        mvc.perform(get("/hotels/featured")).andExpect(jsonPath("$", hasSize(1)));
        adminDelete("/admin/hotels/" + hotel).andExpect(status().isNoContent());

        mvc.perform(get("/hotels/featured")).andExpect(jsonPath("$", hasSize(0)));
        mvc.perform(get("/hotels?destination=da-lat&checkIn=2027-01-10&checkOut=2027-01-12"))
                .andExpect(jsonPath("$.items", hasSize(0)));
        mvc.perform(get("/hotels/khach-san-a")).andExpect(status().isNotFound());
        postAs("/bookings/hotels", customer, hotelBooking(room, "2027-02-10", "2027-02-12", 2, 1))
                .andExpect(status().isBadRequest());
        getAs("/bookings/" + bookingCode, customer)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hotel.hotelName").value("Khách sạn khach-san-a"));
    }
}
