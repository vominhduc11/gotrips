package com.gotrips.gotrips_api.payment;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Repository;

import com.gotrips.gotrips_api.booking.Booking;
import com.gotrips.gotrips_api.booking.BookingStatus;
import com.gotrips.gotrips_api.booking.Payment;
import com.gotrips.gotrips_api.booking.PaymentStatus;

import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;

/** Lọc và phân trang giao dịch trong SQL: đếm, chọn id của trang, rồi service mới nạp chi tiết. */
@Repository
@RequiredArgsConstructor
class AdminBankTransactionPageQuery {

    private final EntityManager em;

    record Result(List<Long> ids, int page, int size, long totalItems, long totalPages) {
    }

    Result search(AdminBankTransactionFilters filters) {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        var countQuery = cb.createQuery(Long.class);
        var counted = countQuery.from(BankTransaction.class);
        countQuery.select(cb.count(counted)).where(conditions(cb, counted, filters));
        long total = em.createQuery(countQuery).getSingleResult();
        int size = filters.pageSize();
        long totalPages = Math.max(1L, Math.ceilDiv(total, size));
        int page = (int) Math.min(filters.pageNumber(), totalPages);
        if (total == 0) {
            return new Result(List.of(), page, size, 0, totalPages);
        }

        var idQuery = cb.createQuery(Long.class);
        var transaction = idQuery.from(BankTransaction.class);
        idQuery.select(transaction.get("id")).where(conditions(cb, transaction, filters))
                .orderBy(cb.desc(transaction.get("receivedAt")), cb.desc(transaction.get("id")));
        List<Long> ids = em.createQuery(idQuery)
                .setFirstResult(Math.toIntExact((long) (page - 1) * size))
                .setMaxResults(size)
                .getResultList();
        return new Result(ids, page, size, total, totalPages);
    }

    private static Predicate[] conditions(CriteriaBuilder cb, Root<BankTransaction> transaction,
            AdminBankTransactionFilters filters) {
        Join<BankTransaction, Booking> booking = transaction.join("booking", JoinType.LEFT);
        Join<Booking, Payment> payment = booking.join("payment", JoinType.LEFT);
        List<Predicate> conditions = new ArrayList<>();

        if (filters.needsReview() != null) {
            Predicate needsReview = needsReview(cb, transaction, booking, payment);
            conditions.add(filters.needsReview() ? needsReview : cb.not(needsReview));
        }
        if (filters.outcome() != null) {
            conditions.add(cb.equal(transaction.get("outcome"), filters.outcome()));
        }
        if (filters.bookingCode() != null && !filters.bookingCode().isBlank()) {
            conditions.add(cb.equal(booking.get("code"), filters.bookingCode().strip().toUpperCase(Locale.ROOT)));
        }
        if (filters.q() != null && !filters.q().isBlank()) {
            // Coi %, _ và ! là ký tự tìm kiếm để kết quả khớp đúng chuỗi nhân viên nhập.
            String text = filters.q().strip().toLowerCase(Locale.ROOT)
                    .replace("!", "!!").replace("%", "!%").replace("_", "!_");
            String pattern = "%" + text + "%";
            conditions.add(cb.or(cb.like(cb.lower(transaction.get("content")), pattern, '!'),
                    cb.like(cb.lower(cb.coalesce(transaction.get("referenceCode"), "")), pattern, '!'),
                    cb.like(cb.lower(booking.get("code")), pattern, '!')));
        }
        return conditions.toArray(Predicate[]::new);
    }

    /**
     * Bản SQL của {@link BankTransactionRules#needsReview}: chưa được đánh dấu xử lý, và hoặc kết quả không phải APPLIED,
     * hoặc là APPLIED của đơn đã huỷ khi chưa đủ tiền. Giao dịch APPLIED luôn có đơn nên vế sau không gặp NULL, và
     * {@code not(...)} đúng cho mọi dòng.
     */
    private static Predicate needsReview(CriteriaBuilder cb, Root<BankTransaction> transaction,
            Join<BankTransaction, Booking> booking, Join<Booking, Payment> payment) {
        Predicate cancelledBeforePaid = cb.and(cb.equal(booking.get("status"), BookingStatus.CANCELLED),
                cb.equal(payment.get("status"), PaymentStatus.CANCELLED));
        Predicate reviewable = cb.or(cb.notEqual(transaction.get("outcome"), BankTransactionOutcome.APPLIED),
                cancelledBeforePaid);
        return cb.and(cb.isNull(transaction.get("resolvedAt")), reviewable);
    }
}
