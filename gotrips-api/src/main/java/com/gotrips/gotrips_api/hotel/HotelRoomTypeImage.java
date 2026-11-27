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

/** Ảnh của một loại phòng. */
@Entity
@Table(name = "hotel_room_type_images")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class HotelRoomTypeImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Khoá ngoại thuần: ảnh được tải theo danh sách loại phòng của một khách sạn. */
    @Column(name = "room_type_id", nullable = false)
    private Long roomTypeId;

    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @Column(name = "image_alt", nullable = false)
    private String imageAlt;

    /** Thứ tự hiển thị, không trùng trong một loại phòng. */
    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    HotelRoomTypeImage(Long roomTypeId, String imageUrl, String imageAlt, int sortOrder) {
        this.roomTypeId = roomTypeId;
        this.imageUrl = imageUrl;
        this.imageAlt = imageAlt;
        this.sortOrder = sortOrder;
    }
}
