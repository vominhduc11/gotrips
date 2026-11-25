package com.gotrips.gotrips_api.tour;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Một chuyến khởi hành của tour (ngày + giá + số chỗ). Chỉ để ĐỌC ở giai đoạn này.
 * {@code tourId} là khoá ngoại thuần (không map quan hệ): chuyến luôn được tải theo danh sách id của các tour
 * đã chọn, không bao giờ đi từ chuyến sang tour, nên khỏi tạo proxy lazy.
 */
@Entity
@Table(name = "tour_departures")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class TourDeparture {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tour_id", nullable = false)
    private Long tourId;

    /** Ngày khởi hành: kiểu DATE, không múi giờ (ngày lịch ở Việt Nam). */
    @Column(name = "departure_date", nullable = false)
    private LocalDate departureDate;

    /** Giá mỗi khách, VND. */
    @Column(nullable = false)
    private long price;

    /** Giá gốc trước giảm (nếu đang giảm giá), VND. */
    @Column(name = "original_price")
    private Long originalPrice;

    @Column(name = "total_seats", nullable = false)
    private int totalSeats;

    @Column(name = "booked_seats", nullable = false)
    private int bookedSeats;
}
