package com.gotrips.gotrips_api.dashboard;

import static com.gotrips.gotrips_api.TestcontainersConfiguration.NOW;
import static com.gotrips.gotrips_api.TestcontainersConfiguration.TODAY;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;

import java.time.ZoneOffset;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import com.gotrips.gotrips_api.TestcontainersConfiguration;
import com.gotrips.gotrips_api.dashboard.AdminDashboardResponse.DashboardDaily;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class AdminDashboardSnapshotTests {

    @Autowired
    AdminDashboardService service;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    PlatformTransactionManager transactionManager;

    @MockitoSpyBean
    AdminDashboardQuery query;

    @Test
    void aBookingCommittedBetweenQueriesOnlyAppearsInTheNextResponse() {
        UUID user = UUID.randomUUID();
        var write = new TransactionTemplate(transactionManager);
        write.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        var timestamp = NOW.atOffset(ZoneOffset.UTC);
        doAnswer(invocation -> {
            Object days = invocation.callRealMethod();
            // Transaction ghi dùng kết nối khác trong khi transaction dashboard đang đọc.
            write.executeWithoutResult(tx -> {
                jdbc.update("INSERT INTO users (id, email, password_hash, full_name) VALUES (?, ?, '-', 'Khách')",
                        user, user + "@example.com");
                Long id = jdbc.queryForObject("""
                        INSERT INTO bookings (code, kind, user_id, status, total_amount, contact_name, contact_email,
                            contact_phone, created_at)
                        VALUES ('GT444444', 'TOUR', ?, 'PENDING', 123, 'Khách', 'a@example.com', '0123', ?) RETURNING id
                        """, Long.class, user, timestamp);
                jdbc.update("""
                        INSERT INTO payments (booking_id, method, amount, status, paid_at)
                        VALUES (?, 'BANK_TRANSFER', 123, 'PAID', ?)
                        """, id, timestamp);
            });
            return days;
        }).doCallRealMethod().when(query).bookingDays(any(), any());

        try {
            var during = service.get(TODAY, TODAY);
            assertThat(during.newBookings()).isZero();
            assertThat(during.awaitingConfirmation()).isZero();
            assertThat(during.revenueCollected()).isZero();
            assertThat(during.daily()).singleElement().satisfies(day -> {
                assertThat(day.newBookings()).isZero();
                assertThat(day.revenueCollected()).isZero();
            });

            var after = service.get(TODAY, TODAY);
            assertThat(after.newBookings()).isEqualTo(1);
            var kinds = after.newBookingsByKind();
            assertThat(kinds.tour() + kinds.hotel() + kinds.flight()).isEqualTo(after.newBookings());
            assertThat(after.awaitingConfirmation()).isEqualTo(1);
            assertThat(after.revenueCollected()).isEqualByComparingTo("123");
            assertThat(after.daily()).singleElement().extracting(DashboardDaily::newBookings)
                    .isEqualTo(after.newBookings());
            assertThat(after.daily()).singleElement().extracting(DashboardDaily::revenueCollected)
                    .isEqualTo(after.revenueCollected());
        } finally {
            jdbc.update("DELETE FROM bookings WHERE user_id = ?", user);
            jdbc.update("DELETE FROM users WHERE id = ?", user);
        }
    }
}
