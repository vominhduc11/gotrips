package com.gotrips.gotrips_api.hotel;

import java.util.List;

import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.gotrips.gotrips_api.common.catalog.CatalogStatus;

public interface HotelRepository extends JpaRepository<Hotel, Long> {

    /**
     * Khách sạn hiển thị được ở Trang chủ: theo trạng thái, và phải có ít nhất một loại phòng (không có phòng thì
     * không có "giá từ"). Sắp theo điểm khách chấm giảm dần, rồi số đánh giá giảm dần, rồi id (thứ tự luôn cố định).
     * Lọc EXISTS ở DB để {@code limit} áp dụng sau khi bỏ khách sạn chưa có phòng.
     */
    @Query("""
            select h from Hotel h join fetch h.destination
            where h.status = :status
              and exists (select 1 from HotelRoomType r where r.hotelId = h.id)
            order by h.rating desc, h.reviewCount desc, h.id asc
            """)
    List<Hotel> findVisibleWithRooms(@Param("status") CatalogStatus status, Limit limit);
}
