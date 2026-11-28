package com.gotrips.gotrips_api.payment;

import java.time.Instant;
import java.util.UUID;

import com.gotrips.gotrips_api.booking.Booking;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Một giao dịch tiền vào tài khoản nhận, do webhook SePay báo. Dòng được chèn bằng {@code INSERT ... ON CONFLICT}
 * ({@link BankTransactionRepository#insertIfAbsent}) để chống ghi trùng, rồi mới nạp lại thành entity để đối chiếu.
 * Không dùng {@code @ToString}: nội dung chuyển khoản thường có tên người chuyển.
 */
@Entity
@Table(name = "bank_transactions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BankTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sepay_id", nullable = false, updatable = false)
    private long sepayId;

    @Column(nullable = false, length = 100, updatable = false)
    private String gateway;

    @Column(name = "account_number", nullable = false, length = 50, updatable = false)
    private String accountNumber;

    @Column(nullable = false, updatable = false)
    private long amount;

    @Column(nullable = false, updatable = false, columnDefinition = "text")
    private String content;

    @Column(name = "reference_code", length = 255, updatable = false)
    private String referenceCode;

    @Column(name = "transaction_at", nullable = false, updatable = false)
    private Instant transactionAt;

    @Column(name = "received_at", nullable = false, updatable = false)
    private Instant receivedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @Column(name = "applied_amount", nullable = false)
    private long appliedAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BankTransactionOutcome outcome;

    @Column(name = "assigned_by")
    private UUID assignedBy;

    @Column(name = "assigned_at")
    private Instant assignedAt;

    @Column(name = "resolved_by")
    private UUID resolvedBy;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "resolution_note", length = 500)
    private String resolutionNote;

    void markWrongAccount() {
        outcome = BankTransactionOutcome.WRONG_ACCOUNT;
    }

    /** Gắn vào đơn với phần tiền đã được tính; {@code staffId} null = hệ thống tự gắn theo mã trong nội dung. */
    void attachTo(Booking target, long applied, BankTransactionOutcome result, UUID staffId, Instant now) {
        booking = target;
        appliedAmount = applied;
        outcome = result;
        if (staffId != null) {
            assignedBy = staffId;
            assignedAt = now;
        }
    }

    void resolve(UUID staffId, String note, Instant now) {
        resolvedBy = staffId;
        resolvedAt = now;
        resolutionNote = note;
    }
}
