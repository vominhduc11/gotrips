package com.gotrips.gotrips_api.hotel;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface HotelRoomTypeRepository extends JpaRepository<HotelRoomType, Long> {

    /** Giá một đêm thấp nhất của từng khách sạn trong danh sách: một query cho cả danh sách (tránh N+1). */
    @Query("select r.hotelId as hotelId, min(r.pricePerNight) as minPricePerNight from HotelRoomType r "
            + "where r.hotelId in :hotelIds group by r.hotelId")
    List<MinPrice> findMinPriceByHotelIds(@Param("hotelIds") Collection<Long> hotelIds);

    interface MinPrice {
        Long getHotelId();

        Long getMinPricePerNight();
    }
}
