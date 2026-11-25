package com.gotrips.gotrips_api.tour;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.gotrips.gotrips_api.common.catalog.CatalogStatus;

public interface TourRepository extends JpaRepository<Tour, Long> {

    /**
     * Tour nổi bật còn ít nhất một chuyến đặt được (sau {@code today}, còn chỗ), theo id, tối đa {@code limit}.
     * Lọc bằng EXISTS ở DB để {@code limit} áp dụng SAU khi bỏ tour hết chuyến (nếu cắt trước rồi mới lọc thì
     * trang chủ có thể thiếu tour dù còn tour khác đủ điều kiện). Điều kiện "đặt được" lặp lại ở
     * {@link TourCardCalculator} (nguồn chính); ở đây chỉ để cắt sớm.
     * {@code join fetch} điểm đến vì thẻ hiện tên/slug điểm đến và {@code open-in-view} đang tắt.
     */
    @Query("""
            select t from Tour t join fetch t.destination
            where t.status = :status and t.featured = true
              and exists (select 1 from TourDeparture d
                          where d.tourId = t.id and d.departureDate > :today and d.totalSeats > d.bookedSeats)
            order by t.id
            """)
    List<Tour> findFeaturedWithBookableDeparture(@Param("status") CatalogStatus status,
            @Param("today") LocalDate today, Limit limit);

    /** Mọi tour theo trạng thái (trang /tours không lọc điểm đến), theo id. {@code join fetch}: xem trên. */
    @Query("select t from Tour t join fetch t.destination where t.status = :status order by t.id")
    List<Tour> findAllByStatus(@Param("status") CatalogStatus status);

    /** Như {@link #findAllByStatus} nhưng chỉ tour của một điểm đến. */
    @Query("""
            select t from Tour t join fetch t.destination
            where t.status = :status and t.destination.id = :destinationId
            order by t.id
            """)
    List<Tour> findAllByStatusAndDestination(@Param("status") CatalogStatus status,
            @Param("destinationId") Long destinationId);

    /** Tour theo slug và trạng thái; tour HIDDEN coi như không tồn tại (không lộ ra ngoài). */
    @Query("select t from Tour t join fetch t.destination where t.slug = :slug and t.status = :status")
    Optional<Tour> findBySlugAndStatus(@Param("slug") String slug, @Param("status") CatalogStatus status);

    /**
     * Đánh giá của một tour, theo id. Dùng constructor expression vào DTO của package tour và tham chiếu
     * {@code Testimonial} bằng tên entity trong JPQL để package tour không phụ thuộc package testimonial khi biên dịch
     * (testimonial đã phụ thuộc tour qua quan hệ {@code tour}): tránh vòng phụ thuộc giữa hai package.
     */
    @Query("""
            select new com.gotrips.gotrips_api.tour.TourTestimonialResponse(
                t.id, t.tour.id, t.customerName, t.customerCity, t.rating, t.content)
            from Testimonial t
            where t.tour.id = :tourId
            order by t.id
            """)
    List<TourTestimonialResponse> findTestimonials(@Param("tourId") Long tourId);
}
