package com.gotrips.gotrips_api.dashboard;

import static com.gotrips.gotrips_api.config.ClockConfig.BUSINESS_ZONE;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import com.gotrips.gotrips_api.booking.BookingKind;
import com.gotrips.gotrips_api.dashboard.AdminDashboardResponse.DashboardCustomers;
import com.gotrips.gotrips_api.dashboard.AdminDashboardResponse.DashboardDeparture;
import com.gotrips.gotrips_api.dashboard.AdminDashboardResponse.DashboardRefundPending;
import com.gotrips.gotrips_api.dashboard.AdminDashboardResponse.DashboardTours;
import com.gotrips.gotrips_api.tour.AdminDepartureRules;

import lombok.RequiredArgsConstructor;

/** JdbcClient đọc trực tiếp các nhóm PostgreSQL để giữ kiểu ngày và tổng NUMERIC, không dựng entity chỉ để thống kê. */
@Repository
@RequiredArgsConstructor
class AdminDashboardQuery {

    private final JdbcClient jdbc;

    record BookingDay(LocalDate date, BookingKind kind, long count) {
    }

    record BookingWork(long awaitingPayment, long awaitingConfirmation, DashboardRefundPending refundPending) {
    }

    List<BookingDay> bookingDays(OffsetDateTime start, OffsetDateTime end) {
        return jdbc.sql("""
                SELECT CAST(timezone(:zone, b.created_at) AS date) AS day, b.kind, count(*) AS booking_count
                FROM bookings b
                WHERE b.created_at >= :start AND b.created_at < :end
                GROUP BY 1, b.kind
                """).param("zone", BUSINESS_ZONE.getId()).param("start", start).param("end", end)
                .query((rs, row) -> new BookingDay(rs.getObject("day", LocalDate.class),
                        BookingKind.valueOf(rs.getString("kind")), rs.getLong("booking_count"))).list();
    }

    Map<LocalDate, BigDecimal> revenueDays(OffsetDateTime start, OffsetDateTime end) {
        return jdbc.sql("""
                SELECT CAST(timezone(:zone, p.paid_at) AS date) AS day, sum(p.amount) AS revenue
                FROM payments p JOIN bookings b ON b.id = p.booking_id
                WHERE p.status = 'PAID' AND b.status <> 'CANCELLED' AND p.paid_at >= :start AND p.paid_at < :end
                GROUP BY 1
                """).param("zone", BUSINESS_ZONE.getId()).param("start", start).param("end", end)
                .query((rs, row) -> Map.entry(rs.getObject("day", LocalDate.class), rs.getBigDecimal("revenue")))
                .list().stream().collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    BookingWork bookingWork() {
        return jdbc.sql("""
                SELECT count(*) FILTER (WHERE b.status = 'PENDING' AND p.status = 'UNPAID') AS awaiting_payment,
                       count(*) FILTER (WHERE b.status = 'PENDING' AND p.status = 'PAID') AS awaiting_confirmation,
                       count(*) FILTER (WHERE b.status = 'CANCELLED') AS refund_count,
                       coalesce(sum(p.amount) FILTER (WHERE b.status = 'CANCELLED'), 0) AS refund_amount
                FROM bookings b JOIN payments p ON p.booking_id = b.id
                WHERE b.status = 'PENDING' OR (b.status = 'CANCELLED' AND p.status = 'PAID')
                """).query((rs, row) -> new BookingWork(rs.getLong("awaiting_payment"),
                        rs.getLong("awaiting_confirmation"),
                        new DashboardRefundPending(rs.getLong("refund_count"), rs.getBigDecimal("refund_amount"))))
                .single();
    }

    DashboardCustomers customers(OffsetDateTime start, OffsetDateTime end) {
        return jdbc.sql("""
                SELECT count(*) AS total,
                       count(*) FILTER (WHERE u.created_at >= :start AND u.created_at < :end) AS new_customers
                FROM users u JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id
                WHERE r.name = 'CUSTOMER'
                """).param("start", start).param("end", end)
                .query((rs, row) -> new DashboardCustomers(rs.getLong("total"), rs.getLong("new_customers"))).single();
    }

    DashboardTours tours(LocalDate today) {
        return jdbc.sql("""
                SELECT count(*) FILTER (WHERE t.status = 'ACTIVE') AS active,
                       count(*) FILTER (WHERE t.status = 'HIDDEN') AS hidden,
                       count(*) FILTER (WHERE t.status = 'ACTIVE' AND EXISTS (
                           SELECT 1 FROM tour_departures d WHERE d.tour_id = t.id AND d.departure_date > :today
                               AND NOT d.sales_closed AND d.booked_seats < d.total_seats
                       )) AS bookable
                FROM tours t
                WHERE t.status IN ('ACTIVE', 'HIDDEN')
                """).param("today", today)
                .query((rs, row) -> new DashboardTours(rs.getLong("active"), rs.getLong("hidden"),
                        rs.getLong("bookable"))).single();
    }

    List<DashboardDeparture> upcomingDepartures(LocalDate today) {
        return jdbc.sql("""
                SELECT d.id, d.tour_id, t.title, d.departure_date, d.booked_seats, d.total_seats, d.sales_closed
                FROM tour_departures d JOIN tours t ON t.id = d.tour_id
                WHERE t.status = 'ACTIVE' AND d.departure_date > :today AND d.departure_date <= :last_day
                ORDER BY d.departure_date, d.id
                LIMIT 10
                """).param("today", today).param("last_day", today.plusDays(14)).query((rs, row) -> {
                    LocalDate date = rs.getObject("departure_date", LocalDate.class);
                    int booked = rs.getInt("booked_seats");
                    int total = rs.getInt("total_seats");
                    return new DashboardDeparture(rs.getLong("id"), rs.getLong("tour_id"), rs.getString("title"),
                            date, booked, total, AdminDepartureRules.state(date, rs.getBoolean("sales_closed"),
                                    booked, total, today));
                }).list();
    }
}
