package com.gotrips.gotrips_api.hotel;

import java.io.Serializable;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Một tiện ích gắn cho một khách sạn (bảng nối). Map thành entity thay vì {@code @ManyToMany} trên
 * {@link Hotel} để mọi lượt đọc đi qua một query tường minh, không có collection lazy nào có thể vô tình gây N+1.
 * Lưu ý {@code ddl-auto: validate} KHÔNG kiểm khoá chính: khoá khai ở đây phải khớp bảng, nếu không Hibernate gộp nhầm
 * các dòng khác nhau thành một (có test canh).
 */
@Entity
@Table(name = "hotel_amenities")
@IdClass(HotelAmenity.Key.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class HotelAmenity {

    @Id
    @Column(name = "hotel_id", nullable = false)
    private Long hotelId;

    @Id
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "amenity_id", nullable = false)
    private Amenity amenity;

    /** Dòng nối mới. Ghi bằng {@code EntityManager#persist} ({@link HotelCatalogWriter}), không dùng {@code merge}. */
    HotelAmenity(Long hotelId, Amenity amenity) {
        this.hotelId = hotelId;
        this.amenity = amenity;
    }

    /** Khoá chính ghép: tên field trùng với entity; {@code amenity} mang kiểu khoá của {@link Amenity}. */
    @NoArgsConstructor
    @EqualsAndHashCode
    public static class Key implements Serializable {
        private Long hotelId;
        private Long amenity;
    }
}
