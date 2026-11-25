package com.gotrips.gotrips_api.flight;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AirportRepository extends JpaRepository<Airport, String> {

    /** Theo thứ tự gợi ý (đầu mối lớn trước); mã IATA để thứ tự luôn cố định khi trùng. */
    List<Airport> findAllByOrderBySortOrderAscCodeAsc();
}
