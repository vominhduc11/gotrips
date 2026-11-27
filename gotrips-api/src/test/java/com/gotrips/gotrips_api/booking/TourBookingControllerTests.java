package com.gotrips.gotrips_api.booking;

import static com.gotrips.gotrips_api.support.BookingTestClient.CONTACT;
import static com.gotrips.gotrips_api.support.BookingTestClient.body;
import static com.gotrips.gotrips_api.support.BookingTestClient.code;
import static com.gotrips.gotrips_api.support.BookingTestClient.tourBooking;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.gotrips.gotrips_api.TestcontainersConfiguration;
import com.gotrips.gotrips_api.support.BookingApiTest;
import com.gotrips.gotrips_api.support.BookingTestClient.Account;
import com.jayway.jsonpath.JsonPath;

import io.jsonwebtoken.Jwts;

/** POST /bookings/tours. "Hôm nay" cố định là 25/11/2026. */
class TourBookingControllerTests extends BookingApiTest {

    private static final String PATH = "/bookings/tours";

    @Autowired
    private SecretKey jwtSigningKey;

    private long tourId;
    private long departureId;

    @BeforeEach
    void createTour() {
        long destination = data.destination("phu-quoc", "Phú Quốc");
        tourId = data.tour("phu-quoc-4n3d", destination, true, "ACTIVE");
        departureId = data.departure(tourId, "2027-01-14", 8_990_000, null, 10, 6);
    }

    @Test
    void createsAPendingUnpaidBookingWithThePriceFromTheDeparture() throws Exception {
        var result = postAs(PATH, client.customer(), tourBooking(departureId, 2))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value(matchesPattern("GT[2-9A-HJKMNP-Z]{6}")))
                .andExpect(jsonPath("$.kind").value("TOUR"))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.paymentStatus").value("UNPAID"))
                .andExpect(jsonPath("$.totalAmount").value(17_980_000))
                .andExpect(jsonPath("$.createdAt").value(TestcontainersConfiguration.NOW.toString()))
                .andExpect(jsonPath("$.contact.fullName").value("Nguyễn Minh Anh"))
                .andExpect(jsonPath("$.contact.phone").value("0901 234 567"))
                .andExpect(jsonPath("$.note").value("Ăn chay"))
                .andExpect(jsonPath("$.paidAt").value(nullValue()))
                .andExpect(jsonPath("$.confirmedAt").value(nullValue()))
                .andExpect(jsonPath("$.cancelledAt").value(nullValue()))
                .andExpect(jsonPath("$.tour.departureId").value(departureId))
                .andExpect(jsonPath("$.tour.tourSlug").value("phu-quoc-4n3d"))
                .andExpect(jsonPath("$.tour.destinationName").value("Phú Quốc"))
                .andExpect(jsonPath("$.tour.departureDate").value("2027-01-14"))
                .andExpect(jsonPath("$.tour.departureCity").value("TP. Hồ Chí Minh"))
                .andExpect(jsonPath("$.tour.durationDays").value(3))
                .andExpect(jsonPath("$.tour.guests").value(2))
                .andExpect(jsonPath("$.tour.unitPrice").value(8_990_000))
                .andExpect(jsonPath("$.tour.travelers[*].fullName", contains("Người đi 1", "Người đi 2")))
                .andExpect(jsonPath("$.tour.travelers[0].dateOfBirth").value("1995-04-12"))
                .andExpect(jsonPath("$.tour.travelers[1].dateOfBirth").value(nullValue()))
                // Chỉ khối ứng với kind có mặt trong JSON.
                .andExpect(jsonPath("$.hotel").doesNotExist())
                .andExpect(jsonPath("$.flight").doesNotExist())
                .andExpect(jsonPath("$.bankTransfer.bankName").value("Ngân hàng Test"))
                .andExpect(jsonPath("$.bankTransfer.accountNumber").value("1234 5678"))
                .andExpect(jsonPath("$.bankTransfer.accountName").value("CONG TY TEST"));

        String bookingCode = code(result);
        assertThat((String) JsonPath.read(body(result), "$.bankTransfer.content")).isEqualTo(bookingCode);
        assertThat(count("SELECT booked_seats FROM tour_departures WHERE id = ?", departureId)).isEqualTo(8);
        assertThat(count("SELECT amount FROM payments p JOIN bookings b ON b.id = p.booking_id WHERE b.code = ?",
                bookingCode)).isEqualTo(17_980_000);
    }

    @Test
    void keepsThePriceAtBookingTimeWhenTheCatalogPriceChanges() throws Exception {
        Account customer = client.customer();
        String bookingCode = code(postAs(PATH, customer, tourBooking(departureId, 2)).andExpect(status().isCreated()));

        jdbc.update("UPDATE tour_departures SET price = 1000000 WHERE id = ?", departureId);
        newRequestBoundary();

        getAs("/bookings/" + bookingCode, customer)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tour.unitPrice").value(8_990_000))
                .andExpect(jsonPath("$.totalAmount").value(17_980_000));
    }

    @Test
    void validatesEveryFieldWithTheWebMessages() throws Exception {
        postAs(PATH, client.customer(), "{}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field=='departureId')].message")
                        .value("Vui lòng chọn ngày khởi hành."))
                .andExpect(jsonPath("$.errors[?(@.field=='guests')].message").value("Số khách phải từ 1 đến 10."))
                .andExpect(jsonPath("$.errors[?(@.field=='contact')]").exists())
                .andExpect(jsonPath("$.errors[?(@.field=='travelers')].message")
                        .value("Số người đi phải bằng số khách đã chọn."));
    }

    @Test
    void reportsExactlyOneErrorPerBlankFieldAndTheFormatErrors() throws Exception {
        String contact = """
                {"fullName":"   ","email":"sai-dinh-dang","phone":"123"}""";
        postAs(PATH, client.customer(), tourBooking(departureId, 1, "[{\"fullName\":\"A\"}]", contact))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field=='contact.fullName')].message")
                        .value("Vui lòng nhập họ tên người liên hệ."))
                .andExpect(jsonPath("$.errors[?(@.field=='contact.email')].message")
                        .value("Địa chỉ email chưa đúng định dạng, ví dụ: ban@example.com."))
                .andExpect(jsonPath("$.errors[?(@.field=='contact.phone')].message")
                        .value("Số điện thoại chưa đúng, ví dụ: 0901 234 567."))
                .andExpect(jsonPath("$.errors[?(@.field=='travelers[0].fullName')].message")
                        .value("Họ và tên cần có ít nhất 2 ký tự."))
                .andExpect(jsonPath("$.errors", hasSize(4)));
    }

    @Test
    void limitsGuestsAndNoteLength() throws Exception {
        String note = "x".repeat(501);
        String json = """
                {"departureId":%d,"guests":11,"contact":%s,"travelers":[{"fullName":"An Bình"}],"note":"%s"}"""
                .formatted(departureId, CONTACT, note);
        postAs(PATH, client.customer(), json)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[*].field", containsInAnyOrder("guests", "note")))
                .andExpect(jsonPath("$.errors[?(@.field=='note')].message").value("Ghi chú không được quá 500 ký tự."));
    }

    @Test
    void requiresOneTravelerPerGuestAndPastBirthDates() throws Exception {
        Account customer = client.customer();
        postAs(PATH, customer, tourBooking(departureId, 2, "[{\"fullName\":\"An Bình\"}]", CONTACT))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("travelers"))
                .andExpect(jsonPath("$.errors[0].message").value("Số người đi phải bằng số khách đã chọn."));
        postAs(PATH, customer,
                tourBooking(departureId, 1, "[{\"fullName\":\"An Bình\",\"dateOfBirth\":\"2026-11-26\"}]", CONTACT))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("travelers[0].dateOfBirth"))
                .andExpect(jsonPath("$.errors[0].message").value("Ngày sinh không được sau hôm nay."));
    }

    @Test
    void treatsAMissingDepartureAndAHiddenTourTheSameWay() throws Exception {
        long destination = data.destination("sapa", "Sapa");
        long hidden = data.tour("tour-an", destination, false, "HIDDEN");
        long hiddenDeparture = data.departure(hidden, "2027-01-14", 1_000_000, null, 10, 0);
        Account customer = client.customer();

        for (long id : new long[] { hiddenDeparture, 999_999L }) {
            postAs(PATH, customer, tourBooking(id, 1))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors[0].field").value("departureId"))
                    .andExpect(jsonPath("$.errors[0].message")
                            .value("Chuyến khởi hành này không còn tồn tại. Bạn vui lòng chọn ngày khác."));
        }
    }

    @Test
    void closesOnlineBookingOnTheDepartureDayItself() throws Exception {
        long today = data.departure(tourId, "2026-11-25", 1_000_000, null, 10, 0);

        postAs(PATH, client.customer(), tourBooking(today, 1))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].message")
                        .value("Chuyến này đã đóng đặt chỗ. Bạn vui lòng chọn ngày khác."));
    }

    @Test
    void rejectsWithConflictWhenThereAreNotEnoughSeatsAndBooksNothing() throws Exception {
        Account customer = client.customer(); // còn 4 chỗ

        postAs(PATH, customer, tourBooking(departureId, 5))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors[0].field").value("guests"))
                .andExpect(jsonPath("$.errors[0].message")
                        .value("Chuyến này chỉ còn 4 chỗ. Bạn vui lòng giảm số khách hoặc chọn ngày khác."));
        assertThat(count("SELECT booked_seats FROM tour_departures WHERE id = ?", departureId)).isEqualTo(6);

        postAs(PATH, customer, tourBooking(departureId, 4)).andExpect(status().isCreated());
        postAs(PATH, customer, tourBooking(departureId, 1))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Chuyến này đã hết chỗ. Bạn vui lòng chọn ngày khác."));
        assertThat(count("SELECT count(*) FROM bookings")).isEqualTo(1);
    }

    @Test
    void showsTheReducedSeatsInTheTourDetail() throws Exception {
        postAs(PATH, client.customer(), tourBooking(departureId, 3)).andExpect(status().isCreated());

        getAs("/tours/phu-quoc-4n3d", null)
                .andExpect(jsonPath("$.departures[0].seatsLeft").value(1));
    }

    @Test
    void requiresAToken() throws Exception {
        postAs(PATH, null, tourBooking(departureId, 1)).andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsAValidTokenOfAnAccountThatNoLongerExists() throws Exception {
        Instant now = Instant.now();
        String token = Jwts.builder().issuer("gotrips-api").issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(600))).subject(UUID.randomUUID().toString())
                .claim("roles", java.util.List.of("CUSTOMER")).signWith(jwtSigningKey, Jwts.SIG.HS256).compact();

        postAs(PATH, new Account("khong-ton-tai@example.com", token), tourBooking(departureId, 1))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Phiên đăng nhập không còn hợp lệ."));
    }
}
