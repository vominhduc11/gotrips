package com.gotrips.gotrips_api.hotel;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Ảnh xem thêm của khách sạn (không gồm ảnh đại diện ở {@link Hotel}). */
@Entity
@Table(name = "hotel_images")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class HotelImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Khoá ngoại thuần (không map quan hệ), như {@link HotelRoomType}: ảnh luôn được tải theo khách sạn đã chọn. */
    @Column(name = "hotel_id", nullable = false)
    private Long hotelId;

    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @Column(name = "image_alt", nullable = false)
    private String imageAlt;

    /** Thứ tự hiển thị, không trùng trong một khách sạn. */
    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    HotelImage(Long hotelId, String imageUrl, String imageAlt, int sortOrder) {
        this.hotelId = hotelId;
        this.imageUrl = imageUrl;
        this.imageAlt = imageAlt;
        this.sortOrder = sortOrder;
    }
}
