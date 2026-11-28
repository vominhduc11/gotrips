package com.gotrips.gotrips_api.payment;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

public interface BankTransactionRepository extends JpaRepository<BankTransaction, Long> {

    /**
     * Ghi giao dịch nếu chưa có (theo id của SePay), chưa gắn đơn. Dùng {@code ON CONFLICT DO NOTHING} thay cho "kiểm
     * tra rồi thêm": hai lần gửi cùng một giao dịch chạy đồng thời thì lần sau chờ ở chỉ mục UNIQUE tới khi lần đầu
     * commit rồi nhận 0 dòng, nên tiền không bị cộng hai lần; lần đầu rollback thì lần sau ghi được.
     * {@code referenceCode} luôn khác null (rỗng = không có) để PostgreSQL biết kiểu tham số.
     *
     * @return 1 nếu vừa ghi, 0 nếu giao dịch đã được ghi trước đó
     */
    @Modifying(flushAutomatically = true)
    @Query(value = """
            INSERT INTO bank_transactions (sepay_id, gateway, account_number, amount, content, reference_code,
                transaction_at, received_at, applied_amount, outcome)
            VALUES (:sepayId, :gateway, :accountNumber, :amount, :content, NULLIF(:referenceCode, ''),
                :transactionAt, :receivedAt, 0, 'UNMATCHED')
            ON CONFLICT (sepay_id) DO NOTHING
            """, nativeQuery = true)
    int insertIfAbsent(@Param("sepayId") long sepayId, @Param("gateway") String gateway,
            @Param("accountNumber") String accountNumber, @Param("amount") long amount,
            @Param("content") String content, @Param("referenceCode") String referenceCode,
            @Param("transactionAt") Instant transactionAt, @Param("receivedAt") Instant receivedAt);

    Optional<BankTransaction> findBySepayId(long sepayId);

    /** Khoá dòng giao dịch trước thao tác của nhân viên: hai người cùng gắn một giao dịch thì người sau bị từ chối. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from BankTransaction t where t.id = :id")
    Optional<BankTransaction> lockById(@Param("id") long id);

    /** Kèm đơn và khoản thanh toán để tính lý do cần xử lý ({@code open-in-view: false}). */
    @Query("""
            select t from BankTransaction t left join fetch t.booking b left join fetch b.payment
            where t.id in :ids
            """)
    List<BankTransaction> findAllDetailedByIdIn(@Param("ids") Collection<Long> ids);
}
