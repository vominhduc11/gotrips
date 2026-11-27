package com.gotrips.gotrips_api.booking;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FlightBookingDetailRepository extends JpaRepository<FlightBookingDetail, Long> {

    /** Kèm các chặng trong một query (tránh N+1 khi dựng danh sách đơn). */
    @Query("select f from FlightBookingDetail f left join fetch f.segments where f.bookingId in :bookingIds")
    List<FlightBookingDetail> findWithSegmentsByBookingIdIn(@Param("bookingIds") Collection<Long> bookingIds);
}
