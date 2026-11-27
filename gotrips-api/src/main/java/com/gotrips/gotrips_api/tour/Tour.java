package com.gotrips.gotrips_api.tour;

import java.math.BigDecimal;

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
 * Tour. Giá, ngày và số chỗ nằm ở {@link TourDeparture}, không nằm ở đây. Ghi qua các phương thức nghiệp vụ bên dưới.
 *
 * <p>Mọi lệnh ghi phải khoá dòng tour trước ({@code TourRepository#lockById}): Hibernate ghi lại mọi cột (kể cả
 * {@code status}), nên một lệnh sửa dùng bản cũ có thể làm tour vừa xoá hiện trở lại.
 */
@Entity
@Table(name = "tours")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Tour {

    private static final String DELETED_MESSAGE = "Tour đã bị xoá. Hãy khôi phục trước khi thay đổi.";

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

    /** Giới thiệu ngắn ở trang chi tiết (và mô tả cho công cụ tìm kiếm). */
    @Column(name = "short_description", nullable = false, length = 500)
    private String shortDescription;

    @Column(name = "cover_image_url", nullable = false, length = 500)
    private String coverImageUrl;

    @Column(name = "cover_image_alt", nullable = false)
    private String coverImageAlt;

    /**
     * Điểm trung bình 0–5 (numeric(2,1) nên dùng BigDecimal để Hibernate khớp kiểu cột khi validate). Admin chỉ xem:
     * {@code updatable = false} để lệnh sửa tour không bao giờ ghi đè.
     */
    @Column(nullable = false, precision = 2, scale = 1, updatable = false)
    private BigDecimal rating;

    @Column(name = "review_count", nullable = false, updatable = false)
    private int reviewCount;

    @Column(name = "is_featured", nullable = false)
    private boolean featured;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private CatalogStatus status;

    /** Nội dung nhân viên sửa được. Dữ liệu phải đã được kiểm trước khi tới đây. */
    record Content(String slug, String title, Destination destination, int durationDays, int durationNights,
            String departureCity, String shortDescription, String coverImageUrl, String coverImageAlt,
            boolean featured) {
    }

    /** Tour mới: chưa có đánh giá. */
    static Tour create(Content content, CatalogVisibility visibility) {
        Tour tour = new Tour();
        tour.apply(content);
        tour.rating = new BigDecimal("0.0");
        tour.status = visibility.toStatus();
        return tour;
    }

    void update(Content content) {
        requireNotDeleted();
        apply(content);
    }

    /** Ẩn hoặc hiện lại. Tour đã xoá chỉ quay lại được bằng {@link #restore}. */
    void changeVisibility(CatalogVisibility visibility) {
        requireNotDeleted();
        status = visibility.toStatus();
    }

    /** Xoá mềm: giữ bản ghi và các chuyến cho đơn cũ. */
    void softDelete() {
        if (isDeleted()) {
            throw new ConflictException("Tour này đã bị xoá.");
        }
        status = CatalogStatus.DELETED;
    }

    /** Khôi phục về trạng thái ẩn, để nhân viên kiểm lại trước khi cho hiện. */
    void restore() {
        if (!isDeleted()) {
            throw new ConflictException("Chỉ khôi phục được tour đã xoá.");
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
        title = content.title();
        destination = content.destination();
        durationDays = content.durationDays();
        durationNights = content.durationNights();
        departureCity = content.departureCity();
        shortDescription = content.shortDescription();
        coverImageUrl = content.coverImageUrl();
        coverImageAlt = content.coverImageAlt();
        featured = content.featured();
    }
}
