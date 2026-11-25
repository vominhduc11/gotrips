package com.gotrips.gotrips_api.hotel;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

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

/** Khách sạn. Chỉ để ĐỌC (admin chưa nối API): map các cột mà website cần. Giá nằm ở {@link HotelRoomType}. */
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

    /** Giới thiệu ở trang chi tiết (cột {@code text}). */
    @Column(nullable = false)
    private String description;

    /**
     * Tiện ích, cột {@code text[]} của PostgreSQL. {@code SqlTypes.ARRAY} để Hibernate đọc thẳng thành danh sách
     * (không cần converter) và vẫn qua được {@code ddl-auto: validate}.
     */
    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(nullable = false)
    private List<String> amenities;

    /** Giờ nhận phòng theo giờ địa phương (cột {@code time}). */
    @Column(name = "check_in_time", nullable = false)
    private LocalTime checkInTime;

    /** Giờ trả phòng theo giờ địa phương (cột {@code time}). */
    @Column(name = "check_out_time", nullable = false)
    private LocalTime checkOutTime;
}
