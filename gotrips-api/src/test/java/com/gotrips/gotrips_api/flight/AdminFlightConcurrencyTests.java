package com.gotrips.gotrips_api.flight;

import static com.gotrips.gotrips_api.flight.AdminFlightCatalogTests.SCHEDULES;
import static com.gotrips.gotrips_api.flight.AdminFlightCatalogTests.scheduleChanges;
import static com.gotrips.gotrips_api.support.BookingTestClient.adults;
import static com.gotrips.gotrips_api.support.BookingTestClient.flightBooking;
import static com.gotrips.gotrips_api.support.HotelRequests.json;
import static com.gotrips.gotrips_api.support.HotelRequests.with;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.concurrent.Callable;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.gotrips.gotrips_api.TestcontainersConfiguration;
import com.gotrips.gotrips_api.support.BookingTestClient;
import com.gotrips.gotrips_api.support.BookingTestClient.Account;
import com.gotrips.gotrips_api.support.CatalogTestData;
import com.jayway.jsonpath.JsonPath;

/** Hai request thật trên hai giao dịch, giữ khoá và quan sát PostgreSQL như AdminHotelConcurrencyTests. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AdminFlightConcurrencyTests {

    private static final int TIMEOUT_SECONDS = 30;

    @Autowired
    private MockMvc mvc;
    @Autowired
    private JdbcTemplate jdbc;
    @Autowired
    private PlatformTransactionManager transactionManager;

    private BookingTestClient client;
    private Account staff;
    private Account customer;
    private long schedule;

    enum Change {
        SEATS, TIME, DELETE
    }

    private record Reply(int status, String body) {
        String field() {
            return JsonPath.read(body, "$.errors[0].field");
        }
    }

    @BeforeEach
    void prepare() throws Exception {
        client = new BookingTestClient(mvc, jdbc);
        staff = client.staff();
        customer = client.customer();
        var data = new CatalogTestData(jdbc);
        data.airline("T7", "Hãng thử");
        data.airport("QAA", "Sân bay đi", "Thành phố đi", 1);
        data.airport("QBB", "Sân bay đến", "Thành phố đến", 2);
        schedule = data.schedule("T7", "T7123", "QAA", "QBB", "23:30", 100, 1_250_000, 2);
    }

    @AfterEach
    void cleanUp() {
        jdbc.update("DELETE FROM bookings WHERE id IN (SELECT booking_id FROM flight_booking_segments WHERE schedule_id = ?)",
                schedule);
        jdbc.update("DELETE FROM flight_schedules WHERE id = ?", schedule);
        jdbc.update("DELETE FROM airports WHERE code IN ('QAA', 'QBB')");
        jdbc.update("DELETE FROM airlines WHERE code = 'T7'");
        if (staff != null && customer != null) {
            jdbc.update("DELETE FROM users WHERE email IN (?, ?)", staff.email(), customer.email());
        }
    }

    @ParameterizedTest
    @EnumSource(Change.class)
    void adminWaitsForBookingThenSeesTheNewOrder(Change change) throws Exception {
        Reply reply = blockedUntilCommit(this::book, 201, () -> admin(change));
        assertThat(reply.status()).isEqualTo(409);
        if (change != Change.DELETE) {
            assertThat(reply.field()).isEqualTo(change == Change.SEATS ? "economySeats" : "departTime");
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM flight_booking_segments WHERE schedule_id = ?", Integer.class,
                schedule)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT economy_seats FROM flight_schedules WHERE id = ?", Integer.class, schedule))
                .isEqualTo(2);
    }

    @ParameterizedTest
    @EnumSource(Change.class)
    void bookingWaitsForAdminThenUsesCommittedInventoryAndSchedule(Change change) throws Exception {
        Reply reply = blockedUntilCommit(() -> admin(change), change == Change.DELETE ? 204 : 200, this::book);
        switch (change) {
            case SEATS -> {
                assertThat(reply.status()).isEqualTo(409);
                assertThat(reply.field()).isEqualTo("outboundScheduleId");
            }
            case TIME -> {
                assertThat(reply.status()).isEqualTo(201);
                assertThat(JsonPath.<String>read(reply.body(), "$.flight.segments[0].departTime")).isEqualTo("18:30");
            }
            case DELETE -> {
                assertThat(reply.status()).isEqualTo(400);
                assertThat(reply.field()).isEqualTo("outboundScheduleId");
            }
        }
    }

    private Reply book() throws Exception {
        return response(client.postJson("/bookings/flights", customer.token(), flightBooking(schedule, null, "QAA", "QBB",
                "2027-02-01", null, "ECONOMY", adults(2))));
    }

    private Reply admin(Change change) throws Exception {
        String path = SCHEDULES + "/" + schedule;
        return switch (change) {
            case SEATS -> response(client.send(HttpMethod.PUT, path, staff.token(),
                    json(with(scheduleChanges(), "economySeats", 1))));
            case TIME -> response(client.send(HttpMethod.PUT, path, staff.token(),
                    json(with(scheduleChanges(), "departTime", "18:30"))));
            case DELETE -> response(client.send(HttpMethod.DELETE, path, staff.token(), null));
        };
    }

    private static Reply response(ResultActions result) throws Exception {
        return new Reply(result.andReturn().getResponse().getStatus(), BookingTestClient.body(result));
    }

    private Reply blockedUntilCommit(Callable<Reply> holder, int expectedHolderStatus, Callable<Reply> contender)
            throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        var holderPid = new CompletableFuture<Integer>();
        var commit = new CountDownLatch(1);
        try {
            var holding = executor.submit(() -> {
                try {
                    new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                        try {
                            assertThat(holder.call().status()).isEqualTo(expectedHolderStatus);
                            holderPid.complete(jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
                            assertThat(commit.await(TIMEOUT_SECONDS, TimeUnit.SECONDS)).isTrue();
                        } catch (Exception error) {
                            throw new IllegalStateException(error);
                        }
                    });
                } catch (RuntimeException | Error error) {
                    holderPid.completeExceptionally(error);
                    throw error;
                }
            });
            int pid = holderPid.get(TIMEOUT_SECONDS, TimeUnit.SECONDS);
            var reply = executor.submit(contender);
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
            while (System.nanoTime() < deadline) {
                Integer blocked = jdbc.queryForObject(
                        "SELECT count(*) FROM pg_stat_activity WHERE ? = ANY(pg_blocking_pids(pid))", Integer.class, pid);
                if (blocked != null && blocked > 0) {
                    commit.countDown();
                    holding.get(TIMEOUT_SECONDS, TimeUnit.SECONDS);
                    return reply.get(TIMEOUT_SECONDS, TimeUnit.SECONDS);
                }
                if (reply.isDone()) throw new AssertionError("Request chạy xong khi giao dịch đầu vẫn giữ khoá: " + reply.get());
                Thread.sleep(20);
            }
            throw new AssertionError("PostgreSQL chưa ghi nhận giao dịch thứ hai chờ khoá.");
        } finally {
            commit.countDown();
            executor.shutdownNow();
        }
    }
}
