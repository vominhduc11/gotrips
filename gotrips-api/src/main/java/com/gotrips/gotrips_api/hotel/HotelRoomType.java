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

/**
 * Loại phòng của khách sạn. Chỉ để ĐỌC; hiện chỉ map cột Trang chủ cần ("giá từ" = giá một đêm thấp nhất).
 * Sức chứa, giường, diện tích sẽ được map khi nối trang chi tiết/đặt phòng.
 */
@Entity
@Table(name = "hotel_room_types")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class HotelRoomType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Khoá ngoại thuần (không map quan hệ): loại phòng luôn được tải theo danh sách khách sạn đã chọn. */
    @Column(name = "hotel_id", nullable = false)
    private Long hotelId;

    /** Giá MỘT phòng MỘT đêm, VND. */
    @Column(name = "price_per_night", nullable = false)
    private long pricePerNight;
}
