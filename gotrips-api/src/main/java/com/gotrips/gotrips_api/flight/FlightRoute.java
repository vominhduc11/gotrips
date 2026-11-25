package com.gotrips.gotrips_api.flight;

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

/**
 * Chặng bay phổ biến (gợi ý điểm đi/đến; giá chỉ để tham khảo, không phải giá bán). Chỉ để ĐỌC ở giai đoạn này.
 * Đặt tên trường {@code fromAirport}/{@code toAirport} vì {@code from} là từ khoá của JPQL.
 */
@Entity
@Table(name = "flight_routes")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FlightRoute {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "from_code", nullable = false)
    private Airport fromAirport;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "to_code", nullable = false)
    private Airport toAirport;

    @Column(name = "duration_minutes", nullable = false)
    private int durationMinutes;

    /** Giá tham khảo một chiều cho một hành khách, VND — chỉ để gợi ý, không phải giá bán. */
    @Column(name = "reference_price", nullable = false)
    private long referencePrice;

    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @Column(name = "image_alt", nullable = false)
    private String imageAlt;

    /** Thứ tự hiển thị theo độ phổ biến. */
    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}
