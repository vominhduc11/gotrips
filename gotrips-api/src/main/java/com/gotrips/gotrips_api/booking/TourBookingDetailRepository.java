package com.gotrips.gotrips_api.booking;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface TourBookingDetailRepository extends JpaRepository<TourBookingDetail, Long> {

    List<TourBookingDetail> findByBookingIdIn(Collection<Long> bookingIds);
}
