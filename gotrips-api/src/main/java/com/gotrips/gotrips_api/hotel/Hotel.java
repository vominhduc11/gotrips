package com.gotrips.gotrips_api.hotel;

import java.math.BigDecimal;
import java.time.LocalTime;

import com.gotrips.gotrips_api.common.catalog.CatalogStatus;
import com.gotrips.gotrips_api.common.catalog.CatalogVisibility;
import com.gotrips.gotrips_api.common.error.ConflictException;
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
 * Khách sạn. Giá nằm ở {@link HotelRoomType}; bộ ảnh và tiện ích nằm ở {@link HotelImage}, {@link HotelAmenity}. Ghi
 * qua các phương thức nghiệp vụ bên dưới.
 *
 * <p>Mọi lệnh ghi phải khoá dòng khách sạn trước ({@code HotelRepository#lockById}): Hibernate ghi lại mọi cột (kể cả
 * {@code status}), nên một lệnh sửa dùng bản cũ có thể làm khách sạn vừa xoá hiện trở lại. Thứ tự khoá chung của mọi
 * luồng là khách sạn rồi mới tới loại phòng.
 */
@Entity
@Table(name = "hotels")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Hotel {

    private static final String DELETED_MESSAGE = "Khách sạn đã bị xoá. Hãy khôi phục trước khi thay đổi.";

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

    /**
     * Điểm khách chấm 0–5. Admin chỉ xem: {@code updatable = false} để lệnh sửa khách sạn không bao giờ ghi đè.
     */
    @Column(nullable = false, precision = 2, scale = 1, updatable = false)
    private BigDecimal rating;

    @Column(name = "review_count", nullable = false, updatable = false)
    private int reviewCount;

    /** Giới thiệu ở trang chi tiết (cột {@code text}). */
    @Column(nullable = false)
    private String description;

    /** Giờ nhận phòng theo giờ địa phương (cột {@code time}). */
    @Column(name = "check_in_time", nullable = false)
    private LocalTime checkInTime;

    /** Giờ trả phòng theo giờ địa phương (cột {@code time}). */
    @Column(name = "check_out_time", nullable = false)
    private LocalTime checkOutTime;

    /** Nội dung nhân viên sửa được. Dữ liệu phải đã được kiểm trước khi tới đây. */
    record Content(String slug, String name, Destination destination, int starRating, String area, String imageUrl,
            String imageAlt, String description, LocalTime checkInTime, LocalTime checkOutTime) {
    }

    /** Khách sạn mới: chưa có đánh giá. */
    static Hotel create(Content content, CatalogVisibility visibility) {
        Hotel hotel = new Hotel();
        hotel.apply(content);
        hotel.rating = new BigDecimal("0.0");
        hotel.status = visibility.toStatus();
        return hotel;
    }

    void update(Content content) {
        requireNotDeleted();
        apply(content);
    }

    /** Ẩn hoặc hiện lại. Khách sạn đã xoá chỉ quay lại được bằng {@link #restore}. */
    void changeVisibility(CatalogVisibility visibility) {
        requireNotDeleted();
        status = visibility.toStatus();
    }

    /** Xoá mềm: giữ bản ghi và các loại phòng cho đơn cũ. */
    void softDelete() {
        if (isDeleted()) {
            throw new ConflictException("Khách sạn này đã bị xoá.");
        }
        status = CatalogStatus.DELETED;
    }

    /** Khôi phục về trạng thái ẩn, để nhân viên kiểm lại trước khi cho hiện. */
    void restore() {
        if (!isDeleted()) {
            throw new ConflictException("Chỉ khôi phục được khách sạn đã xoá.");
        }
        status = CatalogStatus.HIDDEN;
    }

    boolean isDeleted() {
        return status == CatalogStatus.DELETED;
    }

    void requireNotDeleted() {
        if (isDeleted()) {
            throw new ConflictException(DELETED_MESSAGE);
        }
    }

    private void apply(Content content) {
        slug = content.slug();
        name = content.name();
        destination = content.destination();
        starRating = content.starRating();
        area = content.area();
        imageUrl = content.imageUrl();
        imageAlt = content.imageAlt();
        description = content.description();
        checkInTime = content.checkInTime();
        checkOutTime = content.checkOutTime();
    }
}
