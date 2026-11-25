package com.gotrips.gotrips_api.tour;

import java.math.BigDecimal;

import com.gotrips.gotrips_api.common.catalog.CatalogStatus;
import com.gotrips.gotrips_api.destination.Destination;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
 * Tour. Entity này hiện chỉ để ĐỌC: chưa map các cột như mô tả ngắn (admin/trang chi tiết chưa nối API) nên
 * không dùng để ghi. Giá, ngày và số chỗ nằm ở {@link TourDeparture}, không nằm ở đây.
 */
@Entity
@Table(name = "tours")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Tour {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 150)
    private String slug;

    @Column(nullable = false)
    private String title;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "destination_id", nullable = false)
    private Destination destination;

    @Column(name = "duration_days", nullable = false)
    private int durationDays;

    @Column(name = "duration_nights", nullable = false)
    private int durationNights;

    /** Nơi tập trung/khởi hành, ví dụ "TP. Hồ Chí Minh". */
    @Column(name = "departure_city", nullable = false, length = 100)
    private String departureCity;

    @Column(name = "cover_image_url", nullable = false, length = 500)
    private String coverImageUrl;

    @Column(name = "cover_image_alt", nullable = false)
    private String coverImageAlt;

    /** Điểm trung bình 0–5 (numeric(2,1) nên dùng BigDecimal để Hibernate khớp kiểu cột khi validate). */
    @Column(nullable = false, precision = 2, scale = 1)
    private BigDecimal rating;

    @Column(name = "review_count", nullable = false)
    private int reviewCount;

    @Column(name = "is_featured", nullable = false)
    private boolean featured;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private CatalogStatus status;
}
