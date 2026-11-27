package com.gotrips.gotrips_api.booking;

import static com.gotrips.gotrips_api.support.BookingTestClient.adults;
import static com.gotrips.gotrips_api.support.BookingTestClient.code;
import static com.gotrips.gotrips_api.support.BookingTestClient.flightBooking;
import static com.gotrips.gotrips_api.support.BookingTestClient.hotelBooking;
import static com.gotrips.gotrips_api.support.BookingTestClient.tourBooking;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.RepeatedTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import com.gotrips.gotrips_api.TestcontainersConfiguration;
import com.gotrips.gotrips_api.support.BookingTestClient;
import com.gotrips.gotrips_api.support.BookingTestClient.Account;
import com.gotrips.gotrips_api.support.CatalogTestData;

/**
 * Hai request đồng thời giành chỗ cuối: đúng MỘT thành công (201), request kia nhận 409. Không dùng
 * {@code @Transactional} (nếu không mọi request chung một transaction thì không có tranh chấp thật), nên dữ liệu được
 * commit thật và test tự dọn sau mỗi lần chạy. Lặp nhiều lần vì tranh chấp phụ thuộc thời điểm.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class BookingConcurrencyTests {

    private static final int REPEATS = 5;

    @Autowired
    private MockMvc mvc;

    @Autowired
    private JdbcTemplate jdbc;

    private CatalogTestData data;
    private BookingTestClient client;

    @BeforeEach
    void setUp() {
        cleanUp();
        data = new CatalogTestData(jdbc);
        client = new BookingTestClient(mvc, jdbc);
    }

    /** Dữ liệu đã commit thật: xoá hết để các test khác (dùng chung container) bắt đầu với danh mục rỗng. */
    @AfterEach
    void cleanUp() {
        // Xoá đơn trước (cascade chi tiết, thanh toán, người đi), rồi danh mục và tài khoản test.
        jdbc.update("DELETE FROM bookings");
        jdbc.update("DELETE FROM tour_departures");
        jdbc.update("DELETE FROM testimonials");
        jdbc.update("DELETE FROM tours");
        jdbc.update("DELETE FROM hotel_room_types");
        jdbc.update("DELETE FROM hotels");
        jdbc.update("DELETE FROM destinations");
        jdbc.update("DELETE FROM flight_schedules");
        jdbc.update("DELETE FROM airlines");
        jdbc.update("DELETE FROM flight_routes");
        jdbc.update("DELETE FROM airports");
        jdbc.update("DELETE FROM users WHERE email LIKE 'khach-%@example.com'");
    }

    /** Chạy hai request cùng lúc (cùng chờ một hiệu lệnh) và trả mã trạng thái của cả hai. */
    private List<Integer> race(Callable<Integer> first, Callable<Integer> second) throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch go = new CountDownLatch(1);
        try {
            List<Future<Integer>> futures = new ArrayList<>();
            for (Callable<Integer> task : List.of(first, second)) {
                futures.add(executor.submit(() -> {
                    ready.countDown();
                    go.await();
                    return task.call();
                }));
            }
            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
            go.countDown();
            List<Integer> statuses = new ArrayList<>();
            for (Future<Integer> future : futures) {
                statuses.add(future.get(30, TimeUnit.SECONDS));
            }
            return statuses;
        } finally {
            executor.shutdownNow();
        }
    }

    private Callable<Integer> request(String path, Account account, String body) {
        return () -> client.postJson(path, account.token(), body).andReturn().getResponse().getStatus();
    }

    private int count(String sql) {
        Integer value = jdbc.queryForObject(sql, Integer.class);
        return value == null ? 0 : value;
    }

    @RepeatedTest(REPEATS)
    void onlyOneOfTwoConcurrentBookingsGetsTheLastTourSeat() throws Exception {
        long destination = data.destination("da-lat", "Đà Lạt");
        long tour = data.tour("tour-tranh-cho", destination, false, "ACTIVE");
        long departure = data.departure(tour, "2027-01-14", 1_000_000, null, 10, 9);
        Account a = client.customer();
        Account b = client.customer();

        List<Integer> statuses = race(request("/bookings/tours", a, tourBooking(departure, 1)),
                request("/bookings/tours", b, tourBooking(departure, 1)));

        assertThat(statuses).containsExactlyInAnyOrder(201, 409);
        assertThat(count("SELECT booked_seats FROM tour_departures")).isEqualTo(10);
        assertThat(count("SELECT count(*) FROM bookings")).isEqualTo(1);
    }

    @RepeatedTest(REPEATS)
    void onlyOneOfTwoConcurrentBookingsGetsTheLastRoom() throws Exception {
        long destination = data.destination("da-lat", "Đà Lạt");
        long hotel = data.hotel("khach-san-tranh-phong", destination, "ACTIVE", 4.0, 1);
        long room = data.room(hotel, 500_000);
        data.totalRooms(room, 1);
        Account a = client.customer();
        Account b = client.customer();

        List<Integer> statuses = race(
                request("/bookings/hotels", a, hotelBooking(room, "2027-01-10", "2027-01-12", 2, 1)),
                request("/bookings/hotels", b, hotelBooking(room, "2027-01-11", "2027-01-13", 2, 1)));

        assertThat(statuses).containsExactlyInAnyOrder(201, 409);
        assertThat(count("SELECT count(*) FROM hotel_bookings")).isEqualTo(1);
    }

    @RepeatedTest(REPEATS)
    void onlyOneOfTwoConcurrentRoundTripsGetsTheLastSeat() throws Exception {
        data.airport("SGN", "Sân bay Tân Sơn Nhất", "TP. Hồ Chí Minh", 1);
        data.airport("HAN", "Sân bay Nội Bài", "Hà Nội", 2);
        data.airline("SV", "Sao Việt Air");
        long outbound = data.schedule("SV", "SV201", "SGN", "HAN", "06:00", 125, 1_000_000, 1);
        long inbound = data.schedule("SV", "SV202", "HAN", "SGN", "09:00", 125, 1_000_000, 1);
        Account a = client.customer();
        Account b = client.customer();

        // Hai đơn khứ hồi NGƯỢC chiều nhau cùng dùng hai lịch bay theo thứ tự chọn ngược nhau: khoá theo thứ tự id nên
        // không deadlock, và chỉ một đơn lấy được ghế cuối của mỗi chặng.
        List<Integer> statuses = race(
                request("/bookings/flights", a, flightBooking(outbound, inbound, "SGN", "HAN", "2027-06-10",
                        "2027-06-10", "ECONOMY", adults(1))),
                request("/bookings/flights", b, flightBooking(inbound, outbound, "HAN", "SGN", "2027-06-10",
                        "2027-06-10", "ECONOMY", adults(1))));

        assertThat(statuses).containsExactlyInAnyOrder(201, 409);
        assertThat(count("SELECT count(*) FROM flight_booking_segments")).isEqualTo(2);
    }

    @RepeatedTest(REPEATS)
    void twoConcurrentCancellationsReleaseTheSeatsOnlyOnce() throws Exception {
        long destination = data.destination("da-lat", "Đà Lạt");
        long tour = data.tour("tour-huy", destination, false, "ACTIVE");
        long departure = data.departure(tour, "2027-01-14", 1_000_000, null, 10, 3);
        Account customer = client.customer();
        String bookingCode = code(client.postJson("/bookings/tours", customer.token(), tourBooking(departure, 2)));
        Account staff = client.staff();
        String path = "/admin/bookings/" + bookingCode + "/cancel";

        List<Integer> statuses = race(request(path, staff, "{}"), request(path, staff, "{}"));

        assertThat(statuses).containsExactlyInAnyOrder(200, 409);
        assertThat(count("SELECT booked_seats FROM tour_departures")).isEqualTo(3);
    }
}
