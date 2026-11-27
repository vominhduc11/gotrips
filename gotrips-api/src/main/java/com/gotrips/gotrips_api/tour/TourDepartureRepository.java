package com.gotrips.gotrips_api.tour;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

public interface TourDepartureRepository extends JpaRepository<TourDeparture, Long> {

    /** Chuyến đặt được (sau {@code today}, đang mở bán, còn chỗ) của các tour đã chọn: một query (tránh N+1). */
    @Query("""
            select d from TourDeparture d
            where d.tourId in :tourIds and d.departureDate > :today and d.salesClosed = false
              and d.totalSeats > d.bookedSeats
            order by d.departureDate, d.id
            """)
    List<TourDeparture> findBookable(@Param("tourIds") Collection<Long> tourIds, @Param("today") LocalDate today);

    /**
     * Mọi chuyến ở tương lai (sau {@code today}) của MỘT tour, kể cả chuyến đã đầy hoặc đã đóng bán: trang chi tiết vẫn
     * cho khách thấy lịch với nhãn "Hết chỗ". Chuyến đã qua bị bỏ.
     */
    @Query("""
            select d from TourDeparture d
            where d.tourId = :tourId and d.departureDate > :today
            order by d.departureDate, d.id
            """)
    List<TourDeparture> findUpcoming(@Param("tourId") Long tourId, @Param("today") LocalDate today);

    /** Mọi chuyến của một tour, kể cả đã qua (trang quản trị). */
    List<TourDeparture> findByTourIdOrderByDepartureDateAscIdAsc(Long tourId);

    /**
     * Id tour của một chuyến, đọc riêng (không nạp entity) để khoá dòng tour TRƯỚC khi khoá và nạp chuyến. Cùng một
     * thứ tự khoá ở mọi nơi (tour rồi chuyến) nên không bị deadlock.
     */
    @Query("select d.tourId from TourDeparture d where d.id = :id")
    Optional<Long> findTourId(@Param("id") Long id);

    /** Khoá dòng chuyến và nạp bản mới nhất. Gọi khi chuyến chưa có trong persistence context. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select d from TourDeparture d where d.id = :id")
    Optional<TourDeparture> lockById(@Param("id") Long id);

    boolean existsByTourIdAndDepartureDate(Long tourId, LocalDate departureDate);

    boolean existsByTourIdAndDepartureDateAndIdNot(Long tourId, LocalDate departureDate, Long id);

    /**
     * Sửa ngày, giá và tổng chỗ bằng MỘT câu UPDATE có điều kiện: trả 0 nếu tổng chỗ mới thấp hơn số đã đặt, nên không
     * tranh được với lệnh giữ chỗ chạy cùng lúc. Không đụng tới {@code bookedSeats}.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            update TourDeparture d
            set d.departureDate = :departureDate, d.price = :price, d.originalPrice = :originalPrice,
                d.totalSeats = :totalSeats
            where d.id = :id and d.bookedSeats <= :totalSeats
            """)
    int updateSchedule(@Param("id") Long id, @Param("departureDate") LocalDate departureDate,
            @Param("price") long price, @Param("originalPrice") Long originalPrice,
            @Param("totalSeats") int totalSeats);

    /**
     * Chuyến nào trong số này đã từng có đơn (kể cả đơn đã huỷ). Tham chiếu {@code TourBookingDetail} bằng tên entity
     * để package tour không phụ thuộc package booking khi biên dịch (booking đã phụ thuộc tour).
     */
    @Query("select b.departureId from TourBookingDetail b where b.departureId in :ids")
    Set<Long> findIdsWithBookings(@Param("ids") Collection<Long> ids);

    /** Số liệu chuyến sắp tới của nhiều tour cho danh sách quản trị: một query (tránh N+1). */
    @Query("""
            select d.tourId as tourId, count(d) as upcomingCount, min(d.departureDate) as nextDate,
                   sum(case when d.salesClosed = false then d.totalSeats - d.bookedSeats else 0 end) as remainingSeats
            from TourDeparture d
            where d.tourId in :tourIds and d.departureDate > :today
            group by d.tourId
            """)
    List<UpcomingStats> findUpcomingStats(@Param("tourIds") Collection<Long> tourIds, @Param("today") LocalDate today);

    interface UpcomingStats {
        Long getTourId();

        Long getUpcomingCount();

        LocalDate getNextDate();

        Long getRemainingSeats();
    }

    /**
     * Giữ {@code seats} chỗ bằng MỘT câu UPDATE có điều kiện: trả 0 nếu không còn đủ chỗ hoặc chuyến đã đóng bán.
     * Postgres khoá dòng khi cập nhật nên hai đơn đồng thời được xếp hàng, đơn sau kiểm điều kiện trên số chỗ ĐÃ cập
     * nhật của đơn trước (không bao giờ bán quá số chỗ). Ghi thẳng xuống DB nên entity đã nạp không đổi theo.
     */
    @Modifying(flushAutomatically = true)
    @Query("update TourDeparture d set d.bookedSeats = d.bookedSeats + :seats "
            + "where d.id = :id and d.salesClosed = false and d.bookedSeats + :seats <= d.totalSeats")
    int reserveSeats(@Param("id") Long id, @Param("seats") int seats);

    /** Trả lại chỗ khi đơn tour bị huỷ. Điều kiện {@code bookedSeats >= seats} để không bao giờ âm. */
    @Modifying(flushAutomatically = true)
    @Query("update TourDeparture d set d.bookedSeats = d.bookedSeats - :seats "
            + "where d.id = :id and d.bookedSeats >= :seats")
    int releaseSeats(@Param("id") Long id, @Param("seats") int seats);

    /** Số chỗ còn lại đọc TRỰC TIẾP từ DB (không lấy từ entity đã nạp, có thể đã cũ sau khi đơn khác giữ chỗ). */
    @Query("select d.totalSeats - d.bookedSeats from TourDeparture d where d.id = :id")
    Optional<Integer> findSeatsLeft(@Param("id") Long id);

    /** Số chỗ đã đặt đọc trực tiếp từ DB, để báo lỗi khi hạ tổng chỗ quá thấp. */
    @Query("select d.bookedSeats from TourDeparture d where d.id = :id")
    Optional<Integer> findBookedSeats(@Param("id") Long id);
}
