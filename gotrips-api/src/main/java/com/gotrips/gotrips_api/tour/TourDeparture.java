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
 * Một chuyến khởi hành của tour (ngày + giá + số chỗ). Ngày, giá và tổng chỗ sửa bằng
 * {@code TourDepartureRepository#updateSchedule}; số chỗ đã đặt chỉ đổi bằng lệnh giữ/trả chỗ.
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

    @Column(name = "tour_id", nullable = false, updatable = false)
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

    /**
     * {@code updatable = false}: khi Hibernate ghi lại entity (ghi mọi cột), cột này bị bỏ qua nên số đã đặt không bao
     * giờ bị đè bằng bản đã nạp trước đó. Câu UPDATE viết tay (giữ/trả chỗ) không bị ràng buộc bởi cờ này.
     */
    @Column(name = "booked_seats", nullable = false, updatable = false)
    private int bookedSeats;

    /** Nhân viên ngừng nhận khách. Là cờ riêng nên huỷ đơn trả lại chỗ cũng không tự mở bán lại. */
    @Column(name = "sales_closed", nullable = false)
    private boolean salesClosed;

    /** Chuyến mới: chưa ai đặt, đang mở bán. */
    static TourDeparture create(Long tourId, LocalDate departureDate, long price, Long originalPrice, int totalSeats) {
        TourDeparture departure = new TourDeparture();
        departure.tourId = tourId;
        departure.departureDate = departureDate;
        departure.price = price;
        departure.originalPrice = originalPrice;
        departure.totalSeats = totalSeats;
        return departure;
    }

    void closeSales() {
        salesClosed = true;
    }

    void reopenSales() {
        salesClosed = false;
    }
}
