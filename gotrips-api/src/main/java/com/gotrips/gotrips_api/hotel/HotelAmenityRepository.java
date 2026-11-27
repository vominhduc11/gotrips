package com.gotrips.gotrips_api.hotel;

import java.util.List;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

public interface HotelAmenityRepository extends Repository<HotelAmenity, HotelAmenity.Key> {

    /** Tiện ích của một khách sạn theo thứ tự danh mục. {@code join fetch} để không tải từng tiện ích một. */
    @Query("select link from HotelAmenity link join fetch link.amenity a where link.hotelId = :hotelId "
            + "order by a.sortOrder, a.id")
    List<HotelAmenity> findWithAmenityByHotelId(@Param("hotelId") Long hotelId);

    /** Xem {@link HotelImageRepository#deleteAllOfHotel}. */
    @Modifying(flushAutomatically = true)
    @Query("delete from HotelAmenity link where link.hotelId = :hotelId")
    void deleteAllOfHotel(@Param("hotelId") Long hotelId);
}
