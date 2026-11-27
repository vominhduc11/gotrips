package com.gotrips.gotrips_api.hotel;

import java.util.List;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/** Kế thừa {@code Repository} trần: không lộ {@code save}. Dòng mới do {@link HotelCatalogWriter} ghi. */
public interface HotelImageRepository extends Repository<HotelImage, Long> {

    List<HotelImage> findByHotelIdOrderBySortOrder(Long hotelId);

    /**
     * Xoá cả bộ ảnh của một khách sạn bằng MỘT câu lệnh chạy ngay: phải xong trước khi chèn bộ mới vì
     * {@code UNIQUE (hotel_id, sort_order)}. Cố ý không {@code clearAutomatically} (sẽ bỏ mất thay đổi chưa ghi của
     * khách sạn).
     */
    @Modifying(flushAutomatically = true)
    @Query("delete from HotelImage image where image.hotelId = :hotelId")
    void deleteAllOfHotel(@Param("hotelId") Long hotelId);
}
