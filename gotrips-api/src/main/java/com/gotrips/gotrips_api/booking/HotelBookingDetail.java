package com.gotrips.gotrips_api.booking;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Phần riêng của đơn đặt phòng: một loại phòng × số phòng × số đêm. */
@Entity
@Table(name = "hotel_bookings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class HotelBookingDetail {

    @Id
    @Column(name = "booking_id")
    private Long bookingId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Column(name = "room_type_id", nullable = false)
    private Long roomTypeId;

    @Column(name = "check_in", nullable = false)
    private LocalDate checkIn;

    @Column(name = "check_out", nullable = false)
    private LocalDate checkOut;

    @Column(nullable = false)
    private int nights;

    @Column(nullable = false)
    private int rooms;

    @Column(nullable = false)
    private int guests;

    /** Giá một phòng một đêm tại thời điểm đặt, VND. */
    @Column(name = "price_per_night", nullable = false)
    private long pricePerNight;

    @Column(name = "guest_name", nullable = false, length = 100)
    private String guestName;

    @Builder
    private HotelBookingDetail(Booking booking, Long roomTypeId, LocalDate checkIn, LocalDate checkOut, int nights,
            int rooms, int guests, long pricePerNight, String guestName) {
        this.booking = booking;
        this.roomTypeId = roomTypeId;
        this.checkIn = checkIn;
        this.checkOut = checkOut;
        this.nights = nights;
        this.rooms = rooms;
        this.guests = guests;
        this.pricePerNight = pricePerNight;
        this.guestName = guestName;
    }
}
