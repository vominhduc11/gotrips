package com.gotrips.gotrips_api.booking;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface HotelBookingDetailRepository extends JpaRepository<HotelBookingDetail, Long> {

    List<HotelBookingDetail> findByBookingIdIn(Collection<Long> bookingIds);
}
