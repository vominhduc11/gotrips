package com.gotrips.gotrips_api.flight;

import java.util.Collection;
import java.util.List;

import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FlightRouteRepository extends JpaRepository<FlightRoute, Long> {

    /** Khoá cả thao tác thêm dòng mới trong lúc kiểm danh sách gốc. SELECT công khai vẫn đọc được. */
    @Modifying
    @Query(value = "LOCK TABLE flight_routes IN SHARE ROW EXCLUSIVE MODE", nativeQuery = true)
    void lockWrites();

    @Query("select max(r.sortOrder) from FlightRoute r")
    Integer lastSortOrder();

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

    /** Chặng bay tới các sân bay đã cho, theo độ phổ biến (ảnh minh hoạ của đơn vé lấy chặng cùng điểm đến). */
    @Query("""
            select r from FlightRoute r join fetch r.toAirport t
            where t.code in :toCodes
            order by r.sortOrder, r.id
            """)
    List<FlightRoute> findByDestinationCodes(@Param("toCodes") Collection<String> toCodes);
}
