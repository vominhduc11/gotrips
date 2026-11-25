package com.gotrips.gotrips_api.flight;

import java.util.List;

import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface FlightRouteRepository extends JpaRepository<FlightRoute, Long> {

    /**
     * Chặng bay phổ biến theo độ phổ biến (sort_order), rồi id. Khoá ngoại + ràng buộc "điểm đi khác điểm đến"
     * của DB đảm bảo hai đầu luôn là sân bay có thật và khác nhau, nên không cần lọc lại như bên web.
     * {@code join fetch} hai sân bay vì thẻ hiện tên sân bay/thành phố và {@code open-in-view} đang tắt.
     */
    @Query("""
            select r from FlightRoute r join fetch r.fromAirport join fetch r.toAirport
            order by r.sortOrder, r.id
            """)
    List<FlightRoute> findPopular(Limit limit);
}
