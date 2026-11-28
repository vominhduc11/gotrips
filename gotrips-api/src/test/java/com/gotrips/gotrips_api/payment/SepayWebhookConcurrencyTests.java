package com.gotrips.gotrips_api.payment;

import static com.gotrips.gotrips_api.payment.SepayWebhooks.incoming;
import static com.gotrips.gotrips_api.support.BookingTestClient.code;
import static com.gotrips.gotrips_api.support.BookingTestClient.tourBooking;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
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
import com.gotrips.gotrips_api.support.CatalogTestData;

/**
 * Webhook chạy đồng thời thật (không {@code @Transactional}, mỗi request một transaction đã commit): SePay gửi lại
 * cùng một giao dịch trong lúc lần đầu còn chạy, và hai khoản khác nhau của một đơn tới cùng lúc. Tự dọn dữ liệu.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class SepayWebhookConcurrencyTests {

    private static final int REPEATS = 5;
    private static final long TOTAL = 2_000_000;

    @Autowired
    private MockMvc mvc;

    @Autowired
    private JdbcTemplate jdbc;

    private String bookingCode;

    @BeforeEach
    void setUp() throws Exception {
        cleanUp();
        CatalogTestData data = new CatalogTestData(jdbc);
        long destination = data.destination("da-lat", "Đà Lạt");
        long tour = data.tour("tour-thanh-toan", destination, false, "ACTIVE");
        long departure = data.departure(tour, "2027-01-14", 1_000_000, null, 10, 0);
        BookingTestClient client = new BookingTestClient(mvc, jdbc);
        bookingCode = code(client.postJson("/bookings/tours", client.customer().token(), tourBooking(departure, 2))
                .andExpect(status().isCreated()));
    }

    /** Giao dịch tham chiếu đơn (không cascade) nên phải xoá trước đơn. */
    @AfterEach
    void cleanUp() {
        jdbc.update("DELETE FROM bank_transactions");
        jdbc.update("DELETE FROM bookings");
        jdbc.update("DELETE FROM tour_departures");
        jdbc.update("DELETE FROM tours");
        jdbc.update("DELETE FROM destinations");
        jdbc.update("DELETE FROM users WHERE email LIKE 'khach-%@example.com'");
    }

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

    private Callable<Integer> deliver(String body) {
        return () -> SepayWebhooks.send(mvc, body).andReturn().getResponse().getStatus();
    }

    private Map<String, Object> payment() {
        return jdbc.queryForMap("""
                SELECT p.status AS payment_status, p.received_amount, b.status
                FROM payments p JOIN bookings b ON b.id = p.booking_id WHERE b.code = ?""", bookingCode);
    }

    @RepeatedTest(REPEATS)
    void aRetryArrivingWhileTheFirstDeliveryRunsIsCountedOnce() throws Exception {
        String body = incoming(500, 1_500_000, bookingCode, null);

        assertThat(race(deliver(body), deliver(body))).containsExactly(200, 200);

        assertThat(jdbc.queryForObject("SELECT count(*) FROM bank_transactions", Integer.class)).isEqualTo(1);
        assertThat(payment()).containsEntry("received_amount", 1_500_000L).containsEntry("payment_status", "UNPAID");
    }

    @RepeatedTest(REPEATS)
    void twoTransfersForTheSameBookingAddUpExactlyOnce() throws Exception {
        assertThat(race(deliver(incoming(601, 1_200_000, bookingCode, null)),
                deliver(incoming(602, 1_200_000, bookingCode, null)))).containsExactly(200, 200);

        // Khoản tới sau chỉ được tính phần còn thiếu (800.000), phần thừa nằm ở giao dịch OVERPAID.
        assertThat(payment()).containsEntry("received_amount", TOTAL).containsEntry("payment_status", "PAID")
                .containsEntry("status", "CONFIRMED");
        assertThat(jdbc.queryForList("SELECT outcome FROM bank_transactions ORDER BY outcome", String.class))
                .containsExactly("APPLIED", "OVERPAID");
        assertThat(jdbc.queryForObject("SELECT sum(applied_amount) FROM bank_transactions", Long.class))
                .isEqualTo(TOTAL);
    }
}
