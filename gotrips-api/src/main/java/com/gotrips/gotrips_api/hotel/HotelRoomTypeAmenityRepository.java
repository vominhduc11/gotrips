package com.gotrips.gotrips_api.hotel;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

public interface HotelRoomTypeAmenityRepository extends Repository<HotelRoomTypeAmenity, HotelRoomTypeAmenity.Key> {

    /** Tiện ích của nhiều loại phòng trong MỘT query, theo thứ tự danh mục. */
    @Query("select link from HotelRoomTypeAmenity link join fetch link.amenity a "
            + "where link.roomTypeId in :roomTypeIds order by a.sortOrder, a.id")
    List<HotelRoomTypeAmenity> findWithAmenityByRoomTypeIdIn(@Param("roomTypeIds") Collection<Long> roomTypeIds);

    /** Xem {@link HotelImageRepository#deleteAllOfHotel}. */
    @Modifying(flushAutomatically = true)
    @Query("delete from HotelRoomTypeAmenity link where link.roomTypeId = :roomTypeId")
    void deleteAllOfRoomType(@Param("roomTypeId") Long roomTypeId);
}
