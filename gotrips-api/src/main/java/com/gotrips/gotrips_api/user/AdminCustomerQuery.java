package com.gotrips.gotrips_api.user;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
class AdminCustomerQuery {

    private static final String HAS_CUSTOMER_ROLE = """
            WHERE EXISTS (
                SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = u.id AND r.name = 'CUSTOMER'
            )
            """;

    private static final String SEARCH = """
            AND (lower(u.full_name) LIKE :pattern ESCAPE '!' OR lower(u.email) LIKE :pattern ESCAPE '!')
            """;

    // Khoản thanh toán của đơn đã huỷ vẫn có thể mang PAID vì hệ thống chưa có nghiệp vụ hoàn tiền.
    private static final String STATISTICS = """
            SELECT u.id, u.full_name, u.email, u.created_at,
                   count(b.id) AS booking_count, max(b.created_at) AS last_booking_at,
                   coalesce(sum(p.amount) FILTER (WHERE p.status = 'PAID' AND b.status <> 'CANCELLED'), 0) AS total_paid
            FROM users u
            LEFT JOIN bookings b ON b.user_id = u.id
            LEFT JOIN payments p ON p.booking_id = b.id
            """ + HAS_CUSTOMER_ROLE;

    private static final RowMapper<AdminCustomerResponse> ROW = (row, number) -> {
        var lastBookingAt = row.getObject("last_booking_at", OffsetDateTime.class);
        return new AdminCustomerResponse(row.getObject("id", UUID.class), row.getString("full_name"),
                row.getString("email"), row.getObject("created_at", OffsetDateTime.class).toInstant(),
                row.getLong("booking_count"), row.getBigDecimal("total_paid"),
                lastBookingAt == null ? null : lastBookingAt.toInstant());
    };

    private final JdbcClient jdbc;

    long count(String pattern) {
        return searchable("SELECT count(*) FROM users u " + HAS_CUSTOMER_ROLE, pattern, "").query(Long.class).single();
    }

    List<AdminCustomerResponse> page(String pattern, AdminCustomerSort sort, int size, long offset) {
        // Mệnh đề ORDER BY đến từ enum cố định, còn nội dung tìm kiếm luôn truyền bằng tham số.
        String suffix = " GROUP BY u.id ORDER BY " + sort.orderBy() + " LIMIT :size OFFSET :offset";
        return searchable(STATISTICS, pattern, suffix).param("size", size).param("offset", offset).query(ROW).list();
    }

    Optional<AdminCustomerResponse> find(UUID id) {
        return jdbc.sql(STATISTICS + " AND u.id = :id GROUP BY u.id").param("id", id).query(ROW).optional();
    }

    private JdbcClient.StatementSpec searchable(String sql, String pattern, String suffix) {
        if (pattern == null) {
            return jdbc.sql(sql + suffix);
        }
        return jdbc.sql(sql + SEARCH + suffix).param("pattern", pattern);
    }
}
