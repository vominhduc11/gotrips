package com.gotrips.gotrips_api.hotel;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Loại phòng của khách sạn. Chỉ để ĐỌC. Có {@code @Builder} để test thuần của {@link HotelStayCalculator} dựng được
 * mà không cần DB.
 */
@Entity
@Table(name = "hotel_room_types")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class HotelRoomType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Khoá ngoại thuần (không map quan hệ): loại phòng luôn được tải theo danh sách khách sạn đã chọn. */
    @Column(name = "hotel_id", nullable = false)
    private Long hotelId;

    @Column(nullable = false, length = 150)
    private String name;

    /** Giá MỘT phòng MỘT đêm, VND. */
    @Column(name = "price_per_night", nullable = false)
    private long pricePerNight;

    /** Số khách tối đa MỖI phòng. */
    @Column(name = "max_guests", nullable = false)
    private int maxGuests;

    @Column(name = "bed_type", nullable = false, length = 150)
    private String bedType;

    @Column(name = "area_m2", nullable = false)
    private int areaM2;
}
