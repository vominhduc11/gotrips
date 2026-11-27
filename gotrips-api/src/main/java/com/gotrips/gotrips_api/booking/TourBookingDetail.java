package com.gotrips.gotrips_api.booking;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Phần riêng của đơn tour. Số chỗ được giữ ở {@code tour_departures.booked_seats}. */
@Entity
@Table(name = "tour_bookings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TourBookingDetail {

    @Id
    @Column(name = "booking_id")
    private Long bookingId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Column(name = "departure_id", nullable = false)
    private Long departureId;

    @Column(nullable = false)
    private int guests;

    /** Giá mỗi khách tại thời điểm đặt, VND. */
    @Column(name = "unit_price", nullable = false)
    private long unitPrice;

    TourBookingDetail(Booking booking, Long departureId, int guests, long unitPrice) {
        this.booking = booking;
        this.departureId = departureId;
        this.guests = guests;
        this.unitPrice = unitPrice;
    }
}
