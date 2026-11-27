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

/** Một tiện ích gắn cho một loại phòng (bảng nối); xem lý do thiết kế ở {@link HotelAmenity}. */
@Entity
@Table(name = "hotel_room_type_amenities")
@IdClass(HotelRoomTypeAmenity.Key.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class HotelRoomTypeAmenity {

    @Id
    @Column(name = "room_type_id", nullable = false)
    private Long roomTypeId;

    @Id
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "amenity_id", nullable = false)
    private Amenity amenity;

    HotelRoomTypeAmenity(Long roomTypeId, Amenity amenity) {
        this.roomTypeId = roomTypeId;
        this.amenity = amenity;
    }

    /** Khoá chính ghép: tên field trùng với entity; {@code amenity} mang kiểu khoá của {@link Amenity}. */
    @NoArgsConstructor
    @EqualsAndHashCode
    public static class Key implements Serializable {
        private Long roomTypeId;
        private Long amenity;
    }
}
