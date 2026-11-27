package com.gotrips.gotrips_api.booking;

import static com.gotrips.gotrips_api.support.BookingTestClient.adults;
import static com.gotrips.gotrips_api.support.BookingTestClient.code;
import static com.gotrips.gotrips_api.support.BookingTestClient.flightBooking;
import static com.gotrips.gotrips_api.support.BookingTestClient.passenger;
import static com.gotrips.gotrips_api.support.BookingTestClient.passengers;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import com.gotrips.gotrips_api.support.BookingApiTest;
import com.gotrips.gotrips_api.support.BookingTestClient.Account;

/** POST /bookings/flights và ghế còn lại ở GET /flights. "Hôm nay" cố định là 25/11/2026. */
class FlightBookingControllerTests extends BookingApiTest {

    private static final String PATH = "/bookings/flights";
    private static final String DEPART = "2027-06-10";
    private static final String RETURN = "2027-06-15";
    private static final String SEARCH = "/flights?from=SGN&to=HAN&date=" + DEPART;

    private long outbound;
    private long inbound;
    private long lateFlight;

    @BeforeEach
    void createFlights() {
        data.airport("SGN", "Sân bay Tân Sơn Nhất", "TP. Hồ Chí Minh", 1);
        data.airport("HAN", "Sân bay Nội Bài", "Hà Nội", 2);
        data.airline("MT", "Mây Trời Airlines");
        outbound = data.schedule("MT", "MT113", "SGN", "HAN", "08:30", 125, 1_490_000);
        inbound = data.schedule("MT", "MT114", "HAN", "SGN", "15:40", 130, 1_350_000);
        lateFlight = data.schedule("MT", "MT199", "SGN", "HAN", "22:30", 130, 1_690_000, 2);
    }

    private static String family() {
        return passengers(passenger("ADULT", "Nguyễn Minh Anh", null),
                passenger("CHILD", "Nguyễn Bảo Châu", "2020-03-01"),
                passenger("INFANT", "Nguyễn Bảo An", "2026-03-01"));
    }

    @Test
    void createsAOneWayBookingWithFaresPriceLinesAndPassengers() throws Exception {
        data.route("SGN", "HAN", 1);

        postAs(PATH, client.customer(),
                flightBooking(outbound, null, "SGN", "HAN", DEPART, null, "BUSINESS", family()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.kind").value("FLIGHT"))
                // Thương gia: người lớn 4.172.000, trẻ em 3.129.000, em bé 417.000.
                .andExpect(jsonPath("$.totalAmount").value(7_718_000))
                .andExpect(jsonPath("$.flight.cabin").value("BUSINESS"))
                .andExpect(jsonPath("$.flight.segments", hasSize(1)))
                .andExpect(jsonPath("$.flight.segments[0].scheduleId").value(outbound))
                .andExpect(jsonPath("$.flight.segments[0].airline.name").value("Mây Trời Airlines"))
                .andExpect(jsonPath("$.flight.segments[0].flightNumber").value("MT113"))
                .andExpect(jsonPath("$.flight.segments[0].from.code").value("SGN"))
                .andExpect(jsonPath("$.flight.segments[0].to.city").value("Hà Nội"))
                .andExpect(jsonPath("$.flight.segments[0].date").value(DEPART))
                .andExpect(jsonPath("$.flight.segments[0].departTime").value("08:30"))
                .andExpect(jsonPath("$.flight.segments[0].arriveTime").value("10:35"))
                .andExpect(jsonPath("$.flight.segments[0].arrivesNextDay").value(false))
                .andExpect(jsonPath("$.flight.segments[0].fares.child").value(3_129_000))
                .andExpect(jsonPath("$.flight.priceLines[*].passengerType", contains("ADULT", "CHILD", "INFANT")))
                .andExpect(jsonPath("$.flight.priceLines[*].amount", contains(4_172_000, 3_129_000, 417_000)))
                .andExpect(jsonPath("$.flight.passengers[*].type", contains("ADULT", "CHILD", "INFANT")))
                .andExpect(jsonPath("$.flight.passengers[0].dateOfBirth").value(nullValue()))
                .andExpect(jsonPath("$.flight.imageUrl").value("https://img.test/SGNHAN.jpg"))
                .andExpect(jsonPath("$.tour").doesNotExist())
                .andExpect(jsonPath("$.hotel").doesNotExist());
    }

    @Test
    void createsARoundTripAndKeepsTheFaresAtBookingTime() throws Exception {
        Account customer = client.customer();
        String bookingCode = code(postAs(PATH, customer,
                flightBooking(outbound, inbound, "SGN", "HAN", DEPART, RETURN, "ECONOMY", adults(2)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.totalAmount").value(5_680_000))
                .andExpect(jsonPath("$.flight.segments[*].flightNumber", contains("MT113", "MT114")))
                .andExpect(jsonPath("$.flight.segments[1].from.code").value("HAN"))
                .andExpect(jsonPath("$.flight.segments[1].date").value(RETURN))
                .andExpect(jsonPath("$.flight.priceLines[*].segmentIndex", contains(0, 1)))
                .andExpect(jsonPath("$.flight.priceLines[*].quantity", contains(2, 2)))
                // Không có chặng bay phổ biến nào tới HAN → không có ảnh (web dùng ảnh mặc định).
                .andExpect(jsonPath("$.flight.imageUrl").value(nullValue()))
                .andExpect(jsonPath("$.flight.imageAlt").value(nullValue())));

        jdbc.update("UPDATE flight_schedules SET economy_fare = 5000000");
        newRequestBoundary();

        getAs("/bookings/" + bookingCode, customer)
                .andExpect(jsonPath("$.totalAmount").value(5_680_000))
                .andExpect(jsonPath("$.flight.segments[0].fares.adult").value(1_490_000))
                .andExpect(jsonPath("$.flight.priceLines[0].unitPrice").value(1_490_000));
    }

    @Test
    void rejectsSchedulesFlyingTheWrongDirection() throws Exception {
        Account customer = client.customer();
        postAs(PATH, customer, flightBooking(inbound, null, "SGN", "HAN", DEPART, null, "ECONOMY", adults(1)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("outboundScheduleId"))
                .andExpect(jsonPath("$.errors[0].message")
                        .value("Chuyến bay đã chọn không còn khai thác. Bạn vui lòng chọn chuyến khác."));
        postAs(PATH, customer, flightBooking(outbound, lateFlight, "SGN", "HAN", DEPART, RETURN, "ECONOMY", adults(1)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("returnScheduleId"));
        postAs(PATH, customer, flightBooking(999_999, null, "SGN", "HAN", DEPART, null, "ECONOMY", adults(1)))
                .andExpect(status().isBadRequest());
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            2026-11-24 |            | departDate       | Ngày đi không được ở quá khứ.
            2026-11-25 |            | departDate       | Chuyến bay trong ngày hôm nay đã đóng đặt vé trực tuyến. Bạn vui lòng chọn ngày khác.
            2027-06-10 | 2027-06-09 | returnDate       | Ngày về không được trước ngày đi.
            """)
    void rejectsBadDates(String departDate, String returnDate, String field, String message) throws Exception {
        Long returnId = returnDate == null ? null : inbound;
        postAs(PATH, client.customer(),
                flightBooking(outbound, returnId, "SGN", "HAN", departDate, returnDate, "ECONOMY", adults(1)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value(field))
                .andExpect(jsonPath("$.errors[0].message").value(message));
    }

    @Test
    void requiresBothReturnFieldsForARoundTrip() throws Exception {
        Account customer = client.customer();
        postAs(PATH, customer, flightBooking(outbound, null, "SGN", "HAN", DEPART, RETURN, "ECONOMY", adults(1)))
                .andExpect(jsonPath("$.errors[0].field").value("returnScheduleId"))
                .andExpect(jsonPath("$.errors[0].message").value("Vui lòng chọn chuyến về."));
        postAs(PATH, customer, flightBooking(outbound, inbound, "SGN", "HAN", DEPART, null, "ECONOMY", adults(1)))
                .andExpect(jsonPath("$.errors[0].field").value("returnDate"))
                .andExpect(jsonPath("$.errors[0].message").value("Vui lòng chọn ngày về."));
    }

    @Test
    void checksPassengerCountsAndAgesOnTheOutboundDate() throws Exception {
        Account customer = client.customer();
        String twoInfants = passengers(passenger("ADULT", "An Bình", null),
                passenger("INFANT", "Bé Một", "2026-03-01"), passenger("INFANT", "Bé Hai", "2026-03-01"));
        postAs(PATH, customer, flightBooking(outbound, null, "SGN", "HAN", DEPART, null, "ECONOMY", twoInfants))
                .andExpect(jsonPath("$.errors[0].field").value("passengers"))
                .andExpect(jsonPath("$.errors[0].message").value("Số em bé không được nhiều hơn số người lớn."));

        String childOnly = passengers(passenger("CHILD", "Bé Châu", "2020-03-01"));
        postAs(PATH, customer, flightBooking(outbound, null, "SGN", "HAN", DEPART, null, "ECONOMY", childOnly))
                .andExpect(jsonPath("$.errors[0].message").value("Cần ít nhất 1 người lớn."));

        // Tròn 2 tuổi đúng ngày bay thì không còn là em bé.
        String twoYearOldInfant = passengers(passenger("ADULT", "An Bình", null),
                passenger("INFANT", "Bé An", "2025-06-10"));
        postAs(PATH, customer, flightBooking(outbound, null, "SGN", "HAN", DEPART, null, "ECONOMY", twoYearOldInfant))
                .andExpect(jsonPath("$.errors[0].field").value("passengers[1].dateOfBirth"))
                .andExpect(jsonPath("$.errors[0].message").value("Em bé phải dưới 2 tuổi vào ngày bay."));

        String childWithoutBirthDate = passengers(passenger("ADULT", "An Bình", null),
                passenger("CHILD", "Bé Châu", null));
        postAs(PATH, customer,
                flightBooking(outbound, null, "SGN", "HAN", DEPART, null, "ECONOMY", childWithoutBirthDate))
                .andExpect(jsonPath("$.errors[0].message").value("Vui lòng nhập ngày sinh để kiểm tra độ tuổi."));
    }

    @Test
    void validatesTheBody() throws Exception {
        postAs(PATH, client.customer(), "{\"passengers\":[]}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[*].field", containsInAnyOrder("outboundScheduleId", "from", "to",
                        "departDate", "cabin", "contact", "passengers")));
        postAs(PATH, client.customer(),
                flightBooking(outbound, null, "SGN", "SGN", DEPART, null, "ECONOMY", adults(1)))
                .andExpect(jsonPath("$.errors[0].field").value("to"))
                .andExpect(jsonPath("$.errors[0].message").value("Điểm đến phải khác điểm đi."));
        postAs(PATH, client.customer(),
                flightBooking(outbound, null, "SGN", "HAN", DEPART, null, "ECONOMY", adults(10)))
                .andExpect(jsonPath("$.errors[0].message").value("Tổng số hành khách tối đa là 9."));
    }

    @Test
    void sellsSeatsPerCabinAndDateWithoutCountingInfantsAndFreesThemOnCancel() throws Exception {
        Account customer = client.customer(); // lateFlight chỉ có 2 ghế phổ thông
        String adultAndInfant = passengers(passenger("ADULT", "An Bình", null),
                passenger("INFANT", "Bé An", "2026-03-01"));
        String bookingCode = code(postAs(PATH, customer,
                flightBooking(lateFlight, null, "SGN", "HAN", DEPART, null, "ECONOMY", adultAndInfant))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.flight.segments[0].arrivesNextDay").value(true))
                .andExpect(jsonPath("$.flight.segments[0].arriveTime").value("00:40")));

        getAs(SEARCH + "&adults=2", null)
                .andExpect(jsonPath("$[1].flightNumber").value("MT199"))
                .andExpect(jsonPath("$[1].seatsLeft").value(1)) // em bé không chiếm ghế
                .andExpect(jsonPath("$[1].isBookable").value(false));

        postAs(PATH, customer, flightBooking(lateFlight, null, "SGN", "HAN", DEPART, null, "ECONOMY", adults(2)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors[0].field").value("outboundScheduleId"))
                .andExpect(jsonPath("$.errors[0].message").value(
                        "Chuyến MT199 chỉ còn 1 ghế ở hạng đã chọn. Bạn vui lòng chọn chuyến khác hoặc giảm số hành khách."));
        // Hạng khác và ngày khác không bị ảnh hưởng.
        postAs(PATH, customer, flightBooking(lateFlight, null, "SGN", "HAN", DEPART, null, "BUSINESS", adults(2)))
                .andExpect(status().isCreated());
        postAs(PATH, customer, flightBooking(lateFlight, null, "SGN", "HAN", "2027-06-11", null, "ECONOMY", adults(2)))
                .andExpect(status().isCreated());

        postAs(PATH, customer, flightBooking(lateFlight, null, "SGN", "HAN", DEPART, null, "ECONOMY", adults(1)))
                .andExpect(status().isCreated());
        postAs(PATH, customer, flightBooking(lateFlight, null, "SGN", "HAN", DEPART, null, "ECONOMY", adults(1)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail")
                        .value("Chuyến MT199 đã hết ghế ở hạng đã chọn. Bạn vui lòng chọn chuyến khác."));

        postAs("/admin/bookings/" + bookingCode + "/cancel", client.staff(), "{}").andExpect(status().isOk());
        getAs(SEARCH, null).andExpect(jsonPath("$[1].seatsLeft").value(1));
    }

    @Test
    void reportsTheFullReturnLegAndBooksNeitherLeg() throws Exception {
        jdbc.update("UPDATE flight_schedules SET economy_seats = 0 WHERE id = ?", inbound);
        newRequestBoundary();

        postAs(PATH, client.customer(),
                flightBooking(outbound, inbound, "SGN", "HAN", DEPART, RETURN, "ECONOMY", adults(1)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errors[0].field").value("returnScheduleId"));
        assertThat(count("SELECT count(*) FROM bookings")).isZero();
    }

    @Test
    void requiresAToken() throws Exception {
        postAs(PATH, null, flightBooking(outbound, null, "SGN", "HAN", DEPART, null, "ECONOMY", adults(1)))
                .andExpect(status().isUnauthorized());
    }
}
