package com.gotrips.gotrips_api.booking;

import static com.gotrips.gotrips_api.config.ClockConfig.BUSINESS_ZONE;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Repository;

import com.gotrips.gotrips_api.common.error.InvalidRequestException;

import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Order;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;

/** Phân trang theo id trước khi tải các quan hệ một-nhiều để SQL áp dụng đúng giới hạn số đơn. */
@Repository
@RequiredArgsConstructor
class AdminBookingPageQuery {

    private final EntityManager em;

    record Result(List<Long> ids, int page, int size, long totalItems, long totalPages) {
    }

    Result search(AdminBookingFilters filters) {
        validateYear(filters.createdFrom(), "createdFrom");
        validateYear(filters.createdTo(), "createdTo");
        if (filters.createdFrom() != null && filters.createdTo() != null
                && filters.createdFrom().isAfter(filters.createdTo())) {
            throw new InvalidRequestException("createdTo", "Ngày kết thúc phải từ ngày bắt đầu trở đi.");
        }

        CriteriaBuilder cb = em.getCriteriaBuilder();
        var countQuery = cb.createQuery(Long.class);
        var counted = countQuery.from(Booking.class);
        countQuery.select(cb.count(counted)).where(conditions(cb, counted, filters));
        long total = em.createQuery(countQuery).getSingleResult();
        int size = filters.pageSize();
        long totalPages = Math.max(1L, Math.ceilDiv(total, size));
        int page = (int) Math.min(filters.pageNumber(), totalPages);
        if (total == 0) {
            return new Result(List.of(), page, size, 0, totalPages);
        }

        var idQuery = cb.createQuery(Long.class);
        var booking = idQuery.from(Booking.class);
        idQuery.select(booking.get("id")).where(conditions(cb, booking, filters))
                .orderBy(order(cb, booking, filters.order()));
        List<Long> ids = em.createQuery(idQuery)
                .setFirstResult(Math.toIntExact((long) (page - 1) * size))
                .setMaxResults(size)
                .getResultList();
        return new Result(ids, page, size, total, totalPages);
    }

    private static void validateYear(LocalDate date, String field) {
        if (date != null && (date.getYear() < 1 || date.getYear() > 9999)) {
            throw new InvalidRequestException(field, "Ngày phải theo định dạng YYYY-MM-DD.");
        }
    }

    private static Predicate[] conditions(CriteriaBuilder cb, Root<Booking> booking, AdminBookingFilters filters) {
        List<Predicate> conditions = new ArrayList<>();
        if (filters.q() != null && !filters.q().isBlank()) {
            // Coi %, _ và ! là ký tự tìm kiếm để kết quả khớp đúng chuỗi người dùng nhập.
            String text = filters.q().strip().toLowerCase(Locale.ROOT)
                    .replace("!", "!!").replace("%", "!%").replace("_", "!_");
            String pattern = "%" + text + "%";
            conditions.add(cb.or(cb.like(cb.lower(booking.get("code")), pattern, '!'),
                    cb.like(cb.lower(booking.get("contactEmail")), pattern, '!'),
                    cb.like(cb.lower(booking.get("contactName")), pattern, '!'),
                    cb.like(cb.lower(booking.get("contactPhone")), pattern, '!')));
        }
        if (filters.kind() != null) {
            conditions.add(cb.equal(booking.get("kind"), filters.kind()));
        }
        if (filters.status() != null) {
            conditions.add(cb.equal(booking.get("status"), filters.status()));
        }
        if (filters.paymentStatus() != null) {
            conditions.add(cb.equal(booking.join("payment").get("status"), filters.paymentStatus()));
        }
        if (filters.customerId() != null) {
            conditions.add(cb.equal(booking.get("userId"), filters.customerId()));
        }
        if (filters.createdFrom() != null) {
            conditions.add(cb.greaterThanOrEqualTo(booking.get("createdAt"),
                    filters.createdFrom().atStartOfDay(BUSINESS_ZONE).toInstant()));
        }
        if (filters.createdTo() != null) {
            conditions.add(cb.lessThan(booking.get("createdAt"),
                    filters.createdTo().plusDays(1).atStartOfDay(BUSINESS_ZONE).toInstant()));
        }
        return conditions.toArray(Predicate[]::new);
    }

    private static List<Order> order(CriteriaBuilder cb, Root<Booking> booking, AdminBookingSort sort) {
        return switch (sort) {
            case CREATED_DESC -> List.of(cb.desc(booking.get("createdAt")), cb.desc(booking.get("id")));
            case CREATED_ASC -> List.of(cb.asc(booking.get("createdAt")), cb.asc(booking.get("id")));
            case TOTAL_DESC -> List.of(cb.desc(booking.get("totalAmount")), cb.desc(booking.get("id")));
            case TOTAL_ASC -> List.of(cb.asc(booking.get("totalAmount")), cb.asc(booking.get("id")));
        };
    }
}
