package com.gotrips.gotrips_api.booking;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import com.gotrips.gotrips_api.flight.CabinClass;
import com.gotrips.gotrips_api.flight.FlightFaresResponse;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Phần riêng của đơn vé máy bay: hạng ghế và các chặng (một chiều: 1, khứ hồi: 2). */
@Entity
@Table(name = "flight_bookings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FlightBookingDetail {

    @Id
    @Column(name = "booking_id")
    private Long bookingId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CabinClass cabin;

    @OneToMany(mappedBy = "flight", cascade = CascadeType.ALL)
    @OrderBy("segmentIndex asc")
    private List<FlightBookingSegment> segments = new ArrayList<>();

    FlightBookingDetail(Booking booking, CabinClass cabin) {
        this.booking = booking;
        this.cabin = cabin;
    }

    /** Thêm chặng tiếp theo (đi trước, về sau) với giá đã chốt. */
    void addSegment(Long scheduleId, LocalDate flightDate, FlightFaresResponse fares) {
        segments.add(new FlightBookingSegment(this, segments.size(), scheduleId, flightDate, fares));
    }
}
