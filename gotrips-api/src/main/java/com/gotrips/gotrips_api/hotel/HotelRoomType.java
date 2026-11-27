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
 * Loại phòng của khách sạn. Dòng này còn được khoá khi đặt phòng và khi nhân viên sửa/xoá: luôn khoá khách sạn trước
 * rồi mới khoá loại phòng. Có {@code @Builder} để test thuần của {@link HotelStayCalculator} dựng được mà không cần DB.
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

    /**
     * Khoá ngoại thuần (không map quan hệ): loại phòng luôn được tải theo danh sách khách sạn đã chọn. Không bao giờ đổi
     * ({@code updatable = false}), nhờ vậy đọc id khách sạn khi CHƯA khoá loại phòng là an toàn.
     */
    @Column(name = "hotel_id", nullable = false, updatable = false)
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

    /** Tổng số phòng của loại này; phòng trống theo ngày xem {@link HotelStayCalculator#availableRooms}. */
    @Column(name = "total_rooms", nullable = false)
    private int totalRooms;

    /** Nội dung nhân viên sửa được. Dữ liệu phải đã được kiểm trước khi tới đây. */
    record Content(String name, long pricePerNight, int maxGuests, String bedType, int areaM2, int totalRooms) {
    }

    static HotelRoomType create(long hotelId, Content content) {
        HotelRoomType roomType = new HotelRoomType();
        roomType.hotelId = hotelId;
        roomType.update(content);
        return roomType;
    }

    /**
     * Giảm {@code totalRooms} chỉ hợp lệ khi nơi gọi đã khoá dòng này và kiểm số phòng đang được giữ
     * ({@code AdminRoomTypeService}).
     */
    void update(Content content) {
        name = content.name();
        pricePerNight = content.pricePerNight();
        maxGuests = content.maxGuests();
        bedType = content.bedType();
        areaM2 = content.areaM2();
        totalRooms = content.totalRooms();
    }
}
