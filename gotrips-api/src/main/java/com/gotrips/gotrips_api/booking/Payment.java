package com.gotrips.gotrips_api.booking;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Khoản thanh toán của đơn (một đơn một khoản). */
@Entity
@Table(name = "payments")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false, unique = true, updatable = false)
    private Booking booking;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, updatable = false)
    private PaymentMethod method;

    /** Số tiền cần thu, VND (= tổng tiền của đơn). */
    @Column(nullable = false, updatable = false)
    private long amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private PaymentStatus status;

    /** Thời điểm khoản được đánh dấu đã thu đủ (nhân viên bấm tay, hoặc hệ thống khi webhook SePay báo đủ tiền). */
    @Column(name = "paid_at")
    private Instant paidAt;

    /**
     * Tổng tiền chuyển khoản đã tính vào khoản này (cộng dồn qua các giao dịch SePay), không vượt {@link #amount}. Nhân
     * viên đánh dấu đã thu bằng tay (tiền mặt, giao dịch SePay không báo) thì giá trị này không đổi.
     */
    @Column(name = "received_amount", nullable = false)
    private long receivedAmount;

    static Payment unpaid(Booking booking, long amount) {
        Payment payment = new Payment();
        payment.booking = booking;
        payment.method = PaymentMethod.BANK_TRANSFER;
        payment.amount = amount;
        payment.status = PaymentStatus.UNPAID;
        return payment;
    }

    void markPaidAt(Instant now) {
        paidAt = now;
    }

    void changeStatus(PaymentStatus next) {
        status = next;
    }

    /** Phần tiền đã được {@link BankTransferAllocation} giới hạn sẵn, nên tổng không vượt {@link #amount}. */
    void addReceived(long applied) {
        receivedAmount += applied;
    }
}
