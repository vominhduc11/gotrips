package com.gotrips.gotrips_api.tour;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TourDepartureRepository extends JpaRepository<TourDeparture, Long> {

    /** Chuyến đặt được (sau {@code today}, còn chỗ) của các tour đã chọn: một query cho cả danh sách (tránh N+1). */
    @Query("""
            select d from TourDeparture d
            where d.tourId in :tourIds and d.departureDate > :today and d.totalSeats > d.bookedSeats
            order by d.departureDate, d.id
            """)
    List<TourDeparture> findBookable(@Param("tourIds") Collection<Long> tourIds, @Param("today") LocalDate today);

    /**
     * Mọi chuyến ở tương lai (sau {@code today}) của MỘT tour, kể cả chuyến đã đầy: trang chi tiết vẫn cho khách thấy
     * lịch với nhãn "Hết chỗ". Chuyến đã qua bị bỏ.
     */
    @Query("""
            select d from TourDeparture d
            where d.tourId = :tourId and d.departureDate > :today
            order by d.departureDate, d.id
            """)
    List<TourDeparture> findUpcoming(@Param("tourId") Long tourId, @Param("today") LocalDate today);
}
