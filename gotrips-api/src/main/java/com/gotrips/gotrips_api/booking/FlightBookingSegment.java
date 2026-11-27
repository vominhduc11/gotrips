package com.gotrips.gotrips_api.booking;

import java.time.LocalDate;

import com.gotrips.gotrips_api.flight.FlightFaresResponse;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

/** Một chặng của đơn vé: lịch bay + ngày bay + giá từng loại hành khách đã chốt lúc đặt. */
@Entity
@Table(name = "flight_booking_segments")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FlightBookingSegment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false, updatable = false)
    private FlightBookingDetail flight;

    /** 0 = chiều đi, 1 = chiều về. */
    @Column(name = "segment_index", nullable = false)
    private int segmentIndex;

    @Column(name = "schedule_id", nullable = false)
    private Long scheduleId;

    @Column(name = "flight_date", nullable = false)
    private LocalDate flightDate;

    @Column(name = "adult_fare", nullable = false)
    private long adultFare;

    @Column(name = "child_fare", nullable = false)
    private long childFare;

    @Column(name = "infant_fare", nullable = false)
    private long infantFare;

    FlightBookingSegment(FlightBookingDetail flight, int segmentIndex, Long scheduleId, LocalDate flightDate,
            FlightFaresResponse fares) {
        this.flight = flight;
        this.segmentIndex = segmentIndex;
        this.scheduleId = scheduleId;
        this.flightDate = flightDate;
        this.adultFare = fares.adult();
        this.childFare = fares.child();
        this.infantFare = fares.infant();
    }
}
