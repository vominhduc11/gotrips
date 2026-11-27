package com.gotrips.gotrips_api.booking;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Phần chung của một đơn đặt chỗ (mọi loại dịch vụ). Chi tiết theo loại nằm ở {@link TourBookingDetail},
 * {@link HotelBookingDetail}, {@link FlightBookingDetail}. Không dùng {@code @ToString}: đơn chứa thông tin cá nhân,
 * không được vô tình in ra log.
 */
@Entity
@Table(name = "bookings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Mã dễ đọc, cũng là nội dung chuyển khoản. */
    @Column(nullable = false, unique = true, length = 8, updatable = false)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10, updatable = false)
    private BookingKind kind;

    /** Chủ đơn: id người dùng (claim {@code sub} của JWT), không theo email. */
    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private BookingStatus status;

    /** Tổng tiền API tính lúc đặt, VND. */
    @Column(name = "total_amount", nullable = false, updatable = false)
    private long totalAmount;

    @Column(name = "contact_name", nullable = false, length = 100)
    private String contactName;

    @Column(name = "contact_email", nullable = false, length = 254)
    private String contactEmail;

    @Column(name = "contact_phone", nullable = false, length = 30)
    private String contactPhone;

    @Column(length = 500)
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @OneToOne(mappedBy = "booking", cascade = CascadeType.ALL, fetch = FetchType.LAZY, optional = false)
    private Payment payment;

    /** Người đi tour hoặc hành khách bay (đơn khách sạn không có). */
    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL)
    @OrderBy("travelerIndex asc")
    private List<BookingTraveler> travelers = new ArrayList<>();

    /** Đơn mới: chờ xác nhận, chưa thanh toán, khoản cần thu = tổng tiền. */
    static Booking pending(String code, UUID userId, BookingKind kind, long totalAmount, ContactRequest contact,
            String note, Instant now) {
        Booking booking = new Booking();
        booking.code = code;
        booking.userId = userId;
        booking.kind = kind;
        booking.status = BookingStatus.PENDING;
        booking.totalAmount = totalAmount;
        booking.contactName = contact.fullName();
        booking.contactEmail = contact.email();
        booking.contactPhone = contact.phone();
        booking.note = note;
        booking.createdAt = now;
        booking.payment = Payment.unpaid(booking, totalAmount);
        return booking;
    }

    void addTraveler(PassengerType passengerType, String fullName, LocalDate dateOfBirth) {
        travelers.add(new BookingTraveler(this, travelers.size(), passengerType, fullName, dateOfBirth));
    }

    /**
     * Áp thao tác của nhân viên theo {@link BookingTransitions}; trạng thái không cho phép thì ném
     * {@code ConflictException} và đơn không đổi.
     */
    void apply(BookingTransitions.Action action, Instant now) {
        BookingTransitions.State next = BookingTransitions.apply(state(), action);
        switch (action) {
            case MARK_PAID -> payment.markPaidAt(now);
            case CONFIRM -> confirmedAt = now;
            case CANCEL -> cancelledAt = now;
        }
        status = next.status();
        payment.changeStatus(next.paymentStatus());
    }
    BookingTransitions.State state() {
        return new BookingTransitions.State(status, payment.getStatus());
    }
}
