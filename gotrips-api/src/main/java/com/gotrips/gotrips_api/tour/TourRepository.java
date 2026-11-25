package com.gotrips.gotrips_api.tour;

import java.time.LocalDate;
import java.util.List;

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
}
