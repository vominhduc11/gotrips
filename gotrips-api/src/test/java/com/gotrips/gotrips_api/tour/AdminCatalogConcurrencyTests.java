package com.gotrips.gotrips_api.tour;

import static com.gotrips.gotrips_api.support.BookingTestClient.body;
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
import org.springframework.http.HttpMethod;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.gotrips.gotrips_api.TestcontainersConfiguration;
import com.gotrips.gotrips_api.support.AdminCatalogApiTest;
import com.gotrips.gotrips_api.support.BookingTestClient;
import com.gotrips.gotrips_api.support.BookingTestClient.Account;
import com.gotrips.gotrips_api.support.CatalogTestData;
import com.jayway.jsonpath.JsonPath;

/**
 * Thao tác của nhân viên chạy cùng lúc với khách đặt chỗ (hoặc với nhau). Không {@code @Transactional} để mỗi request là
 * một transaction thật, nên dữ liệu được commit và test tự dọn. Lặp nhiều lần vì tranh chấp phụ thuộc thời điểm; mỗi
 * lần chấp nhận cả hai thứ tự thắng thua và kiểm bất biến của kết quả.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AdminCatalogConcurrencyTests {

    private static final int REPEATS = 8;

    @Autowired
    private MockMvc mvc;

    @Autowired
    private JdbcTemplate jdbc;

    private CatalogTestData data;
    private BookingTestClient client;
    private Account staff;
    private long destination;
    private long tour;

    private record Reply(int status, String body) {

        String errorField() {
            List<String> fields = JsonPath.read(body, "$.errors[*].field");
            return fields.isEmpty() ? null : fields.get(0);
        }
    }

    @BeforeEach
    void setUp() throws Exception {
        cleanUp();
        data = new CatalogTestData(jdbc);
        client = new BookingTestClient(mvc, jdbc);
        staff = client.staff();
        destination = data.destination("da-lat", "Đà Lạt");
        tour = data.tour("tour-tranh-cho", destination, false, "ACTIVE");
    }

    @AfterEach
    void cleanUp() {
        jdbc.update("DELETE FROM bookings");
        jdbc.update("DELETE FROM tour_departures");
        jdbc.update("DELETE FROM tours");
        jdbc.update("DELETE FROM destinations");
        jdbc.update("DELETE FROM users WHERE email LIKE 'khach-%@example.com'");
    }

    private List<Reply> race(Callable<Reply> first, Callable<Reply> second) throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch go = new CountDownLatch(1);
        try {
            List<Future<Reply>> futures = new ArrayList<>();
            for (Callable<Reply> task : List.of(first, second)) {
                futures.add(executor.submit(() -> {
                    ready.countDown();
                    go.await();
                    return task.call();
                }));
            }
            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
            go.countDown();
            List<Reply> replies = new ArrayList<>();
            for (Future<Reply> future : futures) {
                replies.add(future.get(30, TimeUnit.SECONDS));
            }
            return replies;
        } finally {
            executor.shutdownNow();
        }
    }

    private Callable<Reply> call(HttpMethod method, String path, Account account, String json) {
        return () -> {
            ResultActions result = client.send(method, path, account.token(), json);
            return new Reply(result.andReturn().getResponse().getStatus(), body(result));
        };
    }

    private Callable<Reply> book(long departure, int guests) throws Exception {
        return call(HttpMethod.POST, "/bookings/tours", client.customer(), tourBooking(departure, guests));
    }

    private long departure(int total, int booked) {
        return data.departure(tour, "2027-01-14", 1_000_000, null, total, booked);
    }

    private int count(String sql) {
        Integer value = jdbc.queryForObject(sql, Integer.class);
        return value == null ? 0 : value;
    }

    private static String departureJson(String date, int totalSeats) {
        return """
                {"departureDate":"%s","price":1000000,"originalPrice":null,"totalSeats":%d}"""
                .formatted(date, totalSeats);
    }

    @RepeatedTest(REPEATS)
    void loweringTotalSeatsAndBookingTheSameSeatsNeverOversell() throws Exception {
        long departure = departure(10, 8);

        List<Reply> replies = race(book(departure, 2),
                call(HttpMethod.PUT, "/admin/departures/" + departure, staff, departureJson("2027-01-14", 8)));
        Reply booking = replies.get(0);
        Reply admin = replies.get(1);

        int total = count("SELECT total_seats FROM tour_departures");
        int booked = count("SELECT booked_seats FROM tour_departures");
        assertThat(booked).isLessThanOrEqualTo(total);
        if (booking.status() == 201) {
            // Khách giữ chỗ trước: không hạ được xuống dưới 10 chỗ đã đặt.
            assertThat(admin.status()).isEqualTo(409);
            assertThat(admin.errorField()).isEqualTo("totalSeats");
            assertThat(List.of(total, booked)).containsExactly(10, 10);
        } else {
            // Nhân viên hạ trước: không còn chỗ cho khách.
            assertThat(booking.status()).isEqualTo(409);
            assertThat(admin.status()).isEqualTo(200);
            assertThat(List.of(total, booked)).containsExactly(8, 8);
        }
    }

    @RepeatedTest(REPEATS)
    void deletingADepartureAndBookingItNeverLeavesAnOrphanBooking() throws Exception {
        long departure = departure(10, 0);

        List<Reply> replies = race(book(departure, 1),
                call(HttpMethod.DELETE, "/admin/departures/" + departure, staff, null));
        Reply booking = replies.get(0);
        Reply delete = replies.get(1);

        if (booking.status() == 201) {
            assertThat(delete.status()).isEqualTo(409);
            assertThat(count("SELECT count(*) FROM tour_departures")).isEqualTo(1);
            assertThat(count("SELECT count(*) FROM tour_bookings")).isEqualTo(1);
        } else {
            assertThat(delete.status()).isEqualTo(204);
            // Chuyến đã mất được báo là không tồn tại, không phải "hết chỗ".
            assertThat(booking.status()).isEqualTo(400);
            assertThat(booking.errorField()).isEqualTo("departureId");
            assertThat(count("SELECT count(*) FROM bookings")).isZero();
        }
    }

    @RepeatedTest(REPEATS)
    void closingSalesAndBookingAtOnceStaysConsistent() throws Exception {
        long departure = departure(10, 0);

        List<Reply> replies = race(book(departure, 1),
                call(HttpMethod.POST, "/admin/departures/" + departure + "/close", staff, null));
        Reply booking = replies.get(0);

        assertThat(replies.get(1).status()).isEqualTo(200);
        assertThat(booking.status()).isIn(201, 400);
        assertThat(count("SELECT count(*) FROM tour_departures WHERE sales_closed")).isEqualTo(1);
        assertThat(count("SELECT booked_seats FROM tour_departures")).isEqualTo(booking.status() == 201 ? 1 : 0);
    }

    @RepeatedTest(REPEATS)
    void deletingATourAndBookingItAtOnceStaysConsistent() throws Exception {
        long departure = departure(10, 0);

        List<Reply> replies = race(book(departure, 1),
                call(HttpMethod.DELETE, "/admin/tours/" + tour, staff, null));
        Reply booking = replies.get(0);

        assertThat(replies.get(1).status()).isEqualTo(204);
        assertThat(booking.status()).isIn(201, 400);
        assertThat(count("SELECT count(*) FROM bookings")).isEqualTo(booking.status() == 201 ? 1 : 0);
        assertThat(count("SELECT count(*) FROM tours WHERE status = 'DELETED'")).isEqualTo(1);
    }

    /** Nếu lệnh sửa không khoá dòng tour, nó ghi lại trạng thái cũ và làm tour vừa xoá hiện trở lại. */
    @RepeatedTest(REPEATS)
    void editingATourNeverResurrectsATourDeletedAtTheSameTime() throws Exception {
        String update = """
                {"slug":"tour-tranh-cho","title":"Tên mới","destinationId":%d,"durationDays":3,"durationNights":2,
                "departureCity":"Hà Nội","shortDescription":"Mô tả","coverImageUrl":"%s","coverImageAlt":"Ảnh",
                "featured":false}""".formatted(destination, AdminCatalogApiTest.IMAGE);

        List<Reply> replies = race(call(HttpMethod.PUT, "/admin/tours/" + tour, staff, update),
                call(HttpMethod.DELETE, "/admin/tours/" + tour, staff, null));

        assertThat(replies.get(0).status()).isIn(200, 409);
        assertThat(replies.get(1).status()).isEqualTo(204);
        assertThat(count("SELECT count(*) FROM tours WHERE status = 'DELETED'")).isEqualTo(1);
    }

    /** Hai request cùng qua bước kiểm trước thì ràng buộc UNIQUE chặn, và lỗi vẫn gắn đúng ô. */
    @RepeatedTest(REPEATS)
    void twoDestinationsRacingForOneSlugGetOneCreatedAndOneSlugConflict() throws Exception {
        String json = """
                {"slug":"sapa","name":"Sapa","region":"Tây Bắc","imageUrl":"%s","imageAlt":"Ảnh"}"""
                .formatted(AdminCatalogApiTest.IMAGE);
        Callable<Reply> create = call(HttpMethod.POST, "/admin/destinations", staff, json);

        List<Reply> replies = race(create, create);

        assertThat(replies).extracting(Reply::status).containsExactlyInAnyOrder(201, 409);
        assertThat(replies.stream().filter(r -> r.status() == 409).findFirst().orElseThrow().errorField())
                .isEqualTo("slug");
    }

    @RepeatedTest(REPEATS)
    void twoDeparturesRacingForOneDateGetOneCreatedAndOneDateConflict() throws Exception {
        Callable<Reply> create = call(HttpMethod.POST, "/admin/tours/" + tour + "/departures", staff,
                departureJson("2027-05-01", 10));

        List<Reply> replies = race(create, create);

        assertThat(replies).extracting(Reply::status).containsExactlyInAnyOrder(201, 409);
        assertThat(replies.stream().filter(r -> r.status() == 409).findFirst().orElseThrow().errorField())
                .isEqualTo("departureDate");
        assertThat(count("SELECT count(*) FROM tour_departures")).isEqualTo(1);
    }

    /** Xoá điểm đến trong lúc một tour mới trỏ vào nó: khoá ngoại là chốt chặn, không bên nào ra lỗi 500. */
    @RepeatedTest(REPEATS)
    void deletingADestinationWhileATourIsCreatedForItNeverFailsWithAServerError() throws Exception {
        long empty = data.destination("sapa", "Sapa");
        String json = """
                {"slug":"tour-sapa","title":"Sapa","destinationId":%d,"durationDays":1,"durationNights":0,
                "departureCity":"Hà Nội","shortDescription":"Mô tả","coverImageUrl":"%s","coverImageAlt":"Ảnh",
                "featured":false}""".formatted(empty, AdminCatalogApiTest.IMAGE);

        List<Reply> replies = race(call(HttpMethod.POST, "/admin/tours", staff, json),
                call(HttpMethod.DELETE, "/admin/destinations/" + empty, staff, null));
        Reply create = replies.get(0);
        Reply delete = replies.get(1);

        if (create.status() == 201) {
            assertThat(delete.status()).isEqualTo(409);
        } else {
            assertThat(delete.status()).isEqualTo(204);
            assertThat(create.status()).isEqualTo(400);
            assertThat(create.errorField()).isEqualTo("destinationId");
        }
    }
}
