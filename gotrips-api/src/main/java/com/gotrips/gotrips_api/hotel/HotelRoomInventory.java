package com.gotrips.gotrips_api.hotel;

import java.time.LocalDate;
import java.util.Collection;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

/** Số phòng đã đặt theo loại phòng trong một khoảng ngày. Dùng chung cho tìm khách sạn và đặt phòng. */
@Component
@RequiredArgsConstructor
public class HotelRoomInventory {

    private final HotelRoomTypeRepository roomTypeRepository;

    /** Số phòng đã đặt (đơn chưa huỷ giao [checkIn, checkOut)) theo id loại phòng. Một query cho cả danh sách. */
    public Map<Long, Long> bookedRooms(Collection<Long> roomTypeIds, LocalDate checkIn, LocalDate checkOut) {
        if (roomTypeIds.isEmpty()) {
            return Map.of();
        }
        return roomTypeRepository.countBookedRooms(roomTypeIds, checkIn, checkOut).stream().collect(Collectors.toMap(
                HotelRoomTypeRepository.BookedRooms::getRoomTypeId, HotelRoomTypeRepository.BookedRooms::getRooms));
    }
}
