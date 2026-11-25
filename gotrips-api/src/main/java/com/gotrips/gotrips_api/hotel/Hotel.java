package com.gotrips.gotrips_api.hotel;

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
 * Khách sạn. Chỉ để ĐỌC ở giai đoạn này: chưa map giới thiệu, tiện ích ({@code text[]}) và giờ nhận/trả phòng
 * vì Trang chủ không dùng; các cột đó đã có trong bảng và sẽ được map khi nối trang chi tiết khách sạn.
 */
@Entity
@Table(name = "hotels")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Hotel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 150)
    private String slug;

    @Column(nullable = false, length = 200)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "destination_id", nullable = false)
    private Destination destination;

    /** Hạng sao của khách sạn (1–5), khác với {@link #rating} là điểm khách chấm. */
    @Column(name = "star_rating", nullable = false)
    private int starRating;

    /** Khu vực/địa chỉ ngắn, ví dụ "Phường 3, Đà Lạt". */
    @Column(nullable = false, length = 150)
    private String area;

    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @Column(name = "image_alt", nullable = false)
    private String imageAlt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private CatalogStatus status;

    /** Điểm khách chấm 0–5. */
    @Column(nullable = false, precision = 2, scale = 1)
    private BigDecimal rating;

    @Column(name = "review_count", nullable = false)
    private int reviewCount;
}
