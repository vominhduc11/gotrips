package com.gotrips.gotrips_api.hotel;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.gotrips.gotrips_api.common.catalog.CatalogStatus;

import jakarta.persistence.LockModeType;

public interface HotelRepository extends JpaRepository<Hotel, Long> {

    /**
     * Lọc loại đang bán trước khi áp dụng limit. Lấy giá trong cùng câu SQL để có cùng ảnh chụp dữ liệu,
     * kể cả khi nhân viên vừa ngừng bán loại cuối cùng.
     */
    @Query("""
            select h as hotel,
              (select min(r.pricePerNight) from HotelRoomType r where r.hotelId = h.id and r.totalRooms > 0)
                as minPricePerNight
            from Hotel h join fetch h.destination
            where h.status = :status
              and exists (select 1 from HotelRoomType r where r.hotelId = h.id and r.totalRooms > 0)
            order by h.rating desc, h.reviewCount desc, h.id asc
            """)
    List<FeaturedHotel> findVisibleWithSellingRooms(@Param("status") CatalogStatus status, Limit limit);

    interface FeaturedHotel {
        Hotel getHotel();

        long getMinPricePerNight();
    }

    /** Khách sạn của một điểm đến theo trạng thái (trang tìm khách sạn); thứ tự do {@code HotelStayCalculator} quyết định. */
    @Query("""
            select h from Hotel h join fetch h.destination d
            where h.status = :status and d.id = :destinationId
            order by h.id
            """)
    List<Hotel> findByStatusAndDestination(@Param("status") CatalogStatus status,
            @Param("destinationId") Long destinationId);

    /** Khách sạn kèm điểm đến theo danh sách id, kể cả khách sạn đã ẩn (đơn đã đặt vẫn phải hiện được). */
    @Query("select h from Hotel h join fetch h.destination where h.id in :ids")
    List<Hotel> findAllWithDestinationByIdIn(@Param("ids") Collection<Long> ids);

    /** Chi tiết theo slug; tải luôn điểm đến vì thẻ hiện tên điểm đến ({@code open-in-view: false}). */
    @Query("select h from Hotel h join fetch h.destination where h.slug = :slug and h.status = :status")
    Optional<Hotel> findBySlugAndStatus(@Param("slug") String slug, @Param("status") CatalogStatus status);

    /**
     * Khoá GHI dòng khách sạn (không join) cho mọi lệnh ghi của admin trên khách sạn và loại phòng của nó. Luôn khoá
     * khách sạn TRƯỚC loại phòng.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select h from Hotel h where h.id = :id")
    Optional<Hotel> lockById(@Param("id") Long id);

    /**
     * Khoá CHIA SẺ dòng khách sạn khi đặt phòng: nhiều đơn cùng khách sạn không chặn nhau, nhưng admin không ẩn, xoá hay
     * sửa loại phòng được cho tới khi đơn ghi xong (và ngược lại đơn phải chờ thao tác admin đang dở). Trên PostgreSQL
     * khoá ghi ở trên là {@code FOR NO KEY UPDATE}: nó chặn {@code FOR SHARE} nhưng KHÔNG chặn bước kiểm khoá ngoại,
     * nên mọi luồng phải tự khoá tường minh bằng hai hàm này.
     */
    @Lock(LockModeType.PESSIMISTIC_READ)
    @Query("select h from Hotel h where h.id = :id")
    Optional<Hotel> lockForBooking(@Param("id") Long id);

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);
}
