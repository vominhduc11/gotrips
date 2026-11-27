package com.gotrips.gotrips_api.flight;

import java.time.LocalTime;

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
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Lịch bay cố định: một chuyến bay cụ thể = lịch bay + ngày bay. Đặt vé và quản trị khoá cùng dòng trước khi
 * giữ ghế, sửa hoặc xoá để không đổi giờ của đơn đã đặt và không bán quá số ghế.
 */
@Entity
@Table(name = "flight_schedules")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class FlightSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "airline_code", nullable = false)
    private Airline airline;

    /** Số hiệu chuyến bay, ví dụ "SV212". */
    @Column(name = "flight_number", nullable = false, unique = true, length = 10)
    private String flightNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "from_code", nullable = false)
    private Airport fromAirport;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "to_code", nullable = false)
    private Airport toAirport;

    /** Giờ cất cánh theo giờ địa phương. */
    @Column(name = "depart_time", nullable = false)
    private LocalTime departTime;

    @Column(name = "duration_minutes", nullable = false)
    private int durationMinutes;

    /** Giá hạng Phổ thông cho một người lớn, đã gồm thuế phí, VND. Giá khác tính ở {@link FlightFareCalculator}. */
    @Column(name = "economy_fare", nullable = false)
    private long economyFare;

    @Column(name = "economy_seats", nullable = false)
    private int economySeats;

    @Column(name = "premium_economy_seats", nullable = false)
    private int premiumEconomySeats;

    @Column(name = "business_seats", nullable = false)
    private int businessSeats;

    @Column(name = "first_seats", nullable = false)
    private int firstSeats;

    void update(LocalTime departTime, int durationMinutes, long economyFare, int economySeats,
            int premiumEconomySeats, int businessSeats, int firstSeats) {
        this.departTime = departTime;
        this.durationMinutes = durationMinutes;
        this.economyFare = economyFare;
        this.economySeats = economySeats;
        this.premiumEconomySeats = premiumEconomySeats;
        this.businessSeats = businessSeats;
        this.firstSeats = firstSeats;
    }

    /** Số ghế bán được của hạng {@code cabin} trong MỖI ngày bay. */
    public int seatCapacity(CabinClass cabin) {
        return switch (cabin) {
            case ECONOMY -> economySeats;
            case PREMIUM_ECONOMY -> premiumEconomySeats;
            case BUSINESS -> businessSeats;
            case FIRST -> firstSeats;
        };
    }
}
