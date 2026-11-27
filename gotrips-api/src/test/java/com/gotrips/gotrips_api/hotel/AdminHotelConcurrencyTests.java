package com.gotrips.gotrips_api.hotel;

import static com.gotrips.gotrips_api.support.BookingTestClient.body;
import static com.gotrips.gotrips_api.support.BookingTestClient.hotelBooking;
import static com.gotrips.gotrips_api.support.HotelRequests.image;
import static com.gotrips.gotrips_api.support.HotelRequests.json;
import static com.gotrips.gotrips_api.support.HotelRequests.with;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.fail;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
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
import com.gotrips.gotrips_api.support.HotelRequests;
import com.jayway.jsonpath.JsonPath;

/**
 * Quản trị khách sạn chạy cùng lúc với khách đặt phòng (hoặc với nhau). Không {@code @Transactional} để mỗi request là
 * một transaction thật, nên dữ liệu được commit và test tự dọn.
 *
 * <p>Phần lớn ca ở đây TẤT ĐỊNH chứ không chỉ chạy đua nhiều lần: một giao dịch làm việc của nó rồi giữ nguyên khoá,
 * request còn lại được gửi, và test chỉ cho commit sau khi PostgreSQL báo request đó đang bị giao dịch kia chặn. Việc
 * của giao dịch giữ khoá có thể là một request thật: MockMvc chạy ngay trên luồng đó nên service tham gia giao dịch.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AdminHotelConcurrencyTests {

    private static final int TIMEOUT_SECONDS = 30;
    private static final int REPEATS = 8;

    @Autowired
    private MockMvc mvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private CatalogTestData data;
    private BookingTestClient client;
    private Account staff;
    private long destination;
    private long hotel;
    private long room;

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
        hotel = data.hotel("khach-san-tranh-chap", destination, "ACTIVE", 4.0, 1);
        room = data.room(hotel, 500_000);
        data.totalRooms(room, 3);
    }

    @AfterEach
    void cleanUp() {
        jdbc.update("DELETE FROM bookings");
        jdbc.update("DELETE FROM hotel_room_types");
        jdbc.update("DELETE FROM hotels");
        jdbc.update("DELETE FROM amenities");
        jdbc.update("DELETE FROM destinations");
        jdbc.update("DELETE FROM users WHERE email LIKE 'khach-%@example.com'");
    }

    // ---- Đặt phòng trong lúc khách sạn đang bị ẩn hoặc xoá ----

    /** UPDATE bằng SQL giữ đúng loại khoá dòng mà lệnh ẩn/xoá mềm giữ tới lúc commit. */
    @ParameterizedTest
    @ValueSource(strings = { "HIDDEN", "DELETED" })
    void aBookingWaitsForAnInFlightHideOrDeleteAndIsThenRefused(String newStatus) throws Exception {
        Reply booking = blockedUntilCommit(
                () -> jdbc.update("UPDATE hotels SET status = ? WHERE id = ?", newStatus, hotel), book(room, 1));

        assertRefusedBecauseTheHotelIsClosed(booking);
    }

    @ParameterizedTest
    @ValueSource(strings = { "hide", "delete" })
    void aBookingWaitsForTheRealAdminCommandAndIsThenRefused(String command) throws Exception {
        Runnable admin = command.equals("hide") ? doing(setStatus("HIDDEN"), 200)
                : doing(admin(HttpMethod.DELETE, "/admin/hotels/" + hotel, null), 204);

        Reply booking = blockedUntilCommit(admin, book(room, 1));

        assertRefusedBecauseTheHotelIsClosed(booking);
    }

    @Test
    void anAdminHideWaitsForABookingThatIsBeingCreated() throws Exception {
        Reply hide = blockedUntilCommit(doing(book(room, 1), 201), setStatus("HIDDEN"));

        assertThat(hide.status()).isEqualTo(200);
        assertThat(count("SELECT count(*) FROM bookings")).isEqualTo(1);
        assertThat(hotelStatus()).isEqualTo("HIDDEN");
    }

    // ---- Giảm số phòng và xoá loại phòng ----

    @Test
    void loweringTotalRoomsWaitsForAnInFlightBookingAndCountsItsRooms() throws Exception {
        Reply update = blockedUntilCommit(doing(book(room, 2), 201), setTotalRooms(1));

        assertThat(update.status()).isEqualTo(409);
        assertThat(update.errorField()).isEqualTo("totalRooms");
        assertThat(update.body()).contains("tối thiểu là 2.");
        assertThat(totalRooms()).isEqualTo(3);
    }

    @Test
    void deletingARoomTypeWaitsForItsFirstBookingAndIsThenRefused() throws Exception {
        Reply delete = blockedUntilCommit(doing(book(room, 1), 201),
                admin(HttpMethod.DELETE, "/admin/room-types/" + room, null));

        assertThat(delete.status()).isEqualTo(409);
        assertThat(count("SELECT count(*) FROM hotel_room_types")).isEqualTo(1);
        assertThat(count("SELECT count(*) FROM hotel_bookings")).isEqualTo(1);
    }

    @Test
    void aBookingForARoomTypeBeingDeletedWaitsAndIsToldItDoesNotExist() throws Exception {
        Reply booking = blockedUntilCommit(doing(admin(HttpMethod.DELETE, "/admin/room-types/" + room, null), 204),
                book(room, 1));

        assertThat(booking.status()).isEqualTo(400);
        assertThat(booking.errorField()).isEqualTo("roomTypeId");
        assertThat(booking.body()).contains("Vui lòng chọn loại phòng.");
        assertThat(count("SELECT count(*) FROM bookings")).isZero();
    }

    /** Khoá khách sạn của đơn là khoá CHIA SẺ: đơn của loại phòng khác không phải chờ. */
    @Test
    void bookingsOfDifferentRoomTypesInOneHotelDoNotBlockEachOther() throws Exception {
        long other = data.room(hotel, 700_000);

        Reply second = completedWhileHeld(doing(book(room, 1), 201), book(other, 1));

        assertThat(second.status()).isEqualTo(201);
        assertThat(count("SELECT count(*) FROM bookings")).isEqualTo(2);
    }

    // ---- Lệnh admin với nhau ----

    /** Nếu lệnh sửa đọc trạng thái trước khi có khoá, nó ghi lại trạng thái cũ và làm khách sạn vừa xoá hiện trở lại. */
    @Test
    void anEditNeverResurrectsAHotelDeletedWhileItWaits() throws Exception {
        Reply update = blockedUntilCommit(
                () -> jdbc.update("UPDATE hotels SET status = 'DELETED' WHERE id = ?", hotel),
                admin(HttpMethod.PUT, "/admin/hotels/" + hotel,
                        json(HotelRequests.hotel("khach-san-tranh-chap", destination))));

        assertThat(update.status()).isEqualTo(409);
        assertThat(hotelStatus()).isEqualTo("DELETED");
    }

    @Test
    void aNewRoomTypeIsRefusedWhenItsHotelIsBeingDeleted() throws Exception {
        Reply create = blockedUntilCommit(
                () -> jdbc.update("UPDATE hotels SET status = 'DELETED' WHERE id = ?", hotel),
                admin(HttpMethod.POST, "/admin/hotels/" + hotel + "/room-types",
                        json(HotelRequests.room("Phòng mới", 1))));

        assertThat(create.status()).isEqualTo(409);
        assertThat(count("SELECT count(*) FROM hotel_room_types")).isEqualTo(1);
    }

    /** Khoá dòng điểm đến không thấy khách sạn chưa commit: khoá ngoại là chốt chặn, không bên nào ra lỗi 500. */
    @Test
    void aDestinationCannotBeDeletedWhileAHotelIsBeingCreatedForIt() throws Exception {
        long empty = data.destination("sapa", "Sapa");

        Reply delete = blockedUntilCommit(
                doing(admin(HttpMethod.POST, "/admin/hotels", json(HotelRequests.hotel("khach-san-sapa", empty))),
                        201),
                admin(HttpMethod.DELETE, "/admin/destinations/" + empty, null));

        assertThat(delete.status()).isEqualTo(409);
        assertThat(count("SELECT count(*) FROM destinations")).isEqualTo(2);
    }

    @Test
    void aHotelCreatedWhileItsDestinationIsBeingDeletedGetsAFieldError() throws Exception {
        long empty = data.destination("sapa", "Sapa");

        Reply create = blockedUntilCommit(
                doing(admin(HttpMethod.DELETE, "/admin/destinations/" + empty, null), 204),
                admin(HttpMethod.POST, "/admin/hotels", json(HotelRequests.hotel("khach-san-sapa", empty))));

        assertThat(create.status()).isEqualTo(400);
        assertThat(create.errorField()).isEqualTo("destinationId");
        assertThat(count("SELECT count(*) FROM hotels")).isEqualTo(1);
    }

    // ---- Đua lặp lại ----

    @RepeatedTest(REPEATS)
    void loweringTotalRoomsRacingABookingNeverDropsBelowTheRoomsHeld() throws Exception {
        List<Reply> replies = race(book(room, 2), setTotalRooms(1));
        Reply booking = replies.get(0);
        Reply update = replies.get(1);

        assertThat(count("SELECT coalesce(sum(rooms), 0) FROM hotel_bookings")).isLessThanOrEqualTo(totalRooms());
        if (booking.status() == 201) {
            assertThat(update.status()).isEqualTo(409);
            assertThat(totalRooms()).isEqualTo(3);
        } else {
            assertThat(booking.status()).isEqualTo(409);
            assertThat(update.status()).isEqualTo(200);
            assertThat(totalRooms()).isEqualTo(1);
        }
    }

    /** Hai lệnh cùng thay bộ ảnh: khoá dòng khách sạn xếp hàng chúng nên không đụng UNIQUE (khách sạn, thứ tự). */
    @RepeatedTest(REPEATS)
    void twoEditsReplacingTheGalleryAtOnceBothSucceed() throws Exception {
        String first = json(with(HotelRequests.hotel("khach-san-tranh-chap", destination), "images",
                List.of(image("a"), image("b"))));
        String second = json(with(HotelRequests.hotel("khach-san-tranh-chap", destination), "images",
                List.of(image("c"), image("d"))));

        List<Reply> replies = race(admin(HttpMethod.PUT, "/admin/hotels/" + hotel, first),
                admin(HttpMethod.PUT, "/admin/hotels/" + hotel, second));

        assertThat(replies).extracting(Reply::status).containsExactly(200, 200);
        assertThat(jdbc.queryForList("SELECT sort_order FROM hotel_images ORDER BY sort_order", Integer.class))
                .containsExactly(0, 1);
    }

    // ---- Hỗ trợ ----

    private Callable<Reply> call(HttpMethod method, String path, Account account, String json) {
        return () -> {
            ResultActions result = client.send(method, path, account.token(), json);
            return new Reply(result.andReturn().getResponse().getStatus(), body(result));
        };
    }

    private Callable<Reply> admin(HttpMethod method, String path, String json) {
        return call(method, path, staff, json);
    }

    private Callable<Reply> setStatus(String value) {
        return admin(HttpMethod.PATCH, "/admin/hotels/" + hotel + "/status", "{\"status\":\"" + value + "\"}");
    }

    private Callable<Reply> setTotalRooms(int totalRooms) {
        return admin(HttpMethod.PUT, "/admin/room-types/" + room, json(HotelRequests.room("Phòng", totalRooms)));
    }

    private Callable<Reply> book(long roomType, int rooms) throws Exception {
        return call(HttpMethod.POST, "/bookings/hotels", client.customer(),
                hotelBooking(roomType, "2027-01-10", "2027-01-12", rooms, rooms));
    }

    /** Một request làm việc của giao dịch đang giữ khoá; phải đúng mã trạng thái mong đợi. */
    private static Runnable doing(Callable<Reply> request, int expectedStatus) {
        return () -> {
            try {
                Reply reply = request.call();
                assertThat(reply.status()).as(reply.body()).isEqualTo(expectedStatus);
            } catch (RuntimeException e) {
                throw e;
            } catch (Exception e) {
                throw new IllegalStateException(e);
            }
        };
    }

    private void assertRefusedBecauseTheHotelIsClosed(Reply booking) {
        assertThat(booking.status()).isEqualTo(400);
        assertThat(booking.errorField()).isEqualTo("roomTypeId");
        assertThat(booking.body()).contains("Khách sạn này hiện không nhận đặt phòng.");
        assertThat(count("SELECT count(*) FROM bookings")).isZero();
    }

    private int count(String sql) {
        Integer value = jdbc.queryForObject(sql, Integer.class);
        return value == null ? 0 : value;
    }

    private int totalRooms() {
        return count("SELECT total_rooms FROM hotel_room_types WHERE id = " + room);
    }

    private String hotelStatus() {
        return jdbc.queryForObject("SELECT status FROM hotels WHERE id = ?", String.class, hotel);
    }

    private interface Contention {
        Reply run(int holderPid, Future<Reply> contender, Runnable commitHolder) throws Exception;
    }

    /**
     * Làm {@code holderWork} trong một giao dịch rồi GIỮ NGUYÊN (chưa commit), gửi {@code contender}, đợi tới khi nó bị
     * giao dịch đó chặn, sau đó mới commit và trả kết quả của {@code contender}. Test đỏ nếu {@code contender} chạy xong
     * mà không hề phải chờ.
     */
    private Reply blockedUntilCommit(Runnable holderWork, Callable<Reply> contender) throws Exception {
        return whileHolding(holderWork, contender, (holderPid, reply, commitHolder) -> {
            waitUntilSomethingIsBlockedBy(holderPid, reply);
            commitHolder.run();
            return reply.get(TIMEOUT_SECONDS, TimeUnit.SECONDS);
        });
    }

    /** Ngược lại: {@code contender} phải xong NGAY trong lúc giao dịch kia vẫn chưa commit. */
    private Reply completedWhileHeld(Runnable holderWork, Callable<Reply> contender) throws Exception {
        return whileHolding(holderWork, contender, (holderPid, reply, commitHolder) -> {
            Reply result = reply.get(TIMEOUT_SECONDS, TimeUnit.SECONDS);
            commitHolder.run();
            return result;
        });
    }

    private Reply whileHolding(Runnable holderWork, Callable<Reply> contender, Contention contention)
            throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CompletableFuture<Integer> holderPid = new CompletableFuture<>();
        CountDownLatch release = new CountDownLatch(1);
        try {
            Future<?> holder = executor.submit(() -> {
                try {
                    new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                        holderWork.run();
                        holderPid.complete(jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
                        await(release);
                    });
                } catch (RuntimeException | Error e) {
                    holderPid.completeExceptionally(e);
                    throw e;
                }
            });
            int pid = holderPid.get(TIMEOUT_SECONDS, TimeUnit.SECONDS);
            Future<Reply> reply = executor.submit(contender);
            Reply result = contention.run(pid, reply, () -> {
                release.countDown();
                try {
                    holder.get(TIMEOUT_SECONDS, TimeUnit.SECONDS);
                } catch (Exception e) {
                    throw new IllegalStateException("Giao dịch giữ khoá không commit được.", e);
                }
            });
            return result;
        } finally {
            release.countDown();
            executor.shutdownNow();
        }
    }

    /** Hỏi từ một kết nối autocommit riêng: số liệu hoạt động có thể bị cache trong giao dịch đang giữ khoá. */
    private void waitUntilSomethingIsBlockedBy(int holderPid, Future<Reply> contender) throws Exception {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
        while (System.nanoTime() < deadline) {
            if (count("SELECT count(*) FROM pg_stat_activity WHERE " + holderPid
                    + " = ANY(pg_blocking_pids(pid))") > 0) {
                return;
            }
            if (contender.isDone()) {
                fail("Request chạy xong mà không hề chờ giao dịch đang giữ khoá: " + contender.get());
            }
            Thread.sleep(20);
        }
        fail("Hết thời gian chờ mà không thấy request nào bị chặn.");
    }

    private static void await(CountDownLatch latch) {
        try {
            if (!latch.await(TIMEOUT_SECONDS, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Giao dịch giữ khoá không được cho phép commit.");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e);
        }
    }

    /** Chạy hai request cùng lúc (cùng chờ một hiệu lệnh) và trả kết quả theo thứ tự tham số. */
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
                replies.add(future.get(TIMEOUT_SECONDS, TimeUnit.SECONDS));
            }
            return replies;
        } finally {
            executor.shutdownNow();
        }
    }
}
