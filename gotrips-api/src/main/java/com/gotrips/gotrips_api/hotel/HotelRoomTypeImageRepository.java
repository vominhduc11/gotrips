package com.gotrips.gotrips_api.hotel;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

public interface HotelRoomTypeImageRepository extends Repository<HotelRoomTypeImage, Long> {

    /** Ảnh của nhiều loại phòng trong MỘT query (tránh N+1); gom theo loại phòng vẫn giữ đúng thứ tự. */
    List<HotelRoomTypeImage> findByRoomTypeIdInOrderBySortOrder(Collection<Long> roomTypeIds);

    /** Xem {@link HotelImageRepository#deleteAllOfHotel}. */
    @Modifying(flushAutomatically = true)
    @Query("delete from HotelRoomTypeImage image where image.roomTypeId = :roomTypeId")
    void deleteAllOfRoomType(@Param("roomTypeId") Long roomTypeId);
}
