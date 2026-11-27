package com.gotrips.gotrips_api.flight;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

public interface FlightScheduleRepository extends JpaRepository<FlightSchedule, Long> {

    String ADMIN_FILTERS = """
            where (:fromCode is null or s.fromAirport.code = :fromCode)
              and (:toCode is null or s.toAirport.code = :toCode)
              and (:airlineCode is null or s.airline.code = :airlineCode)
            """;

    String OCCUPIED_SEATS = """
            from FlightBookingSegment s
            join s.flight f
            join f.booking b
            join b.travelers t
            where b.status <> com.gotrips.gotrips_api.booking.BookingStatus.CANCELLED
              and t.passengerType <> com.gotrips.gotrips_api.booking.PassengerType.INFANT
            """;

    @Query("select count(s) from FlightSchedule s " + ADMIN_FILTERS)
    long countAdmin(String fromCode, String toCode, String airlineCode);

    @Query("select s from FlightSchedule s join fetch s.airline join fetch s.fromAirport join fetch s.toAirport "
            + ADMIN_FILTERS)
    List<FlightSchedule> findAdminPage(String fromCode, String toCode, String airlineCode, Pageable page);

    @Query("select distinct s.scheduleId from FlightBookingSegment s where s.scheduleId in :ids")
    List<Long> findEverBookedIds(Collection<Long> ids);

    /** Chỉ gom theo ngày và hạng cần giảm. Dùng cùng điều kiện đếm ghế với luồng đặt vé. */
    @Query("select f.cabin as cabin, count(t.id) as seats " + OCCUPIED_SEATS + """
              and s.scheduleId = :id and s.flightDate >= :today and f.cabin in :cabins
            group by s.flightDate, f.cabin
            """)
    List<DailyBookedSeats> countBookedSeatsByDay(long id, LocalDate today, Collection<CabinClass> cabins);

    /** Lịch bay của một chặng, theo giờ cất cánh rồi id. Tải luôn hãng và hai sân bay ({@code open-in-view: false}). */
    @Query("""
            select s from FlightSchedule s
            join fetch s.airline join fetch s.fromAirport f join fetch s.toAirport t
            where f.code = :from and t.code = :to
            order by s.departTime, s.id
            """)
    List<FlightSchedule> findByRoute(@Param("from") String from, @Param("to") String to);

    /** Một lịch bay, chỉ khi đúng chiều {@code from → to} (id do URL mang tới nên phải kiểm chiều). */
    @Query("""
            select s from FlightSchedule s
            join fetch s.airline join fetch s.fromAirport f join fetch s.toAirport t
            where s.id = :id and f.code = :from and t.code = :to
            """)
    Optional<FlightSchedule> findByIdAndRoute(@Param("id") Long id, @Param("from") String from,
            @Param("to") String to);

    /** Lịch bay kèm hãng và sân bay theo danh sách id (dựng đơn vé đã đặt). */
    @Query("""
            select s from FlightSchedule s
            join fetch s.airline join fetch s.fromAirport join fetch s.toAirport
            where s.id in :ids
            """)
    List<FlightSchedule> findAllWithDetailsByIdIn(@Param("ids") Collection<Long> ids);

    /**
     * Khoá dòng lịch bay tới hết transaction để hai đơn đồng thời không cùng lấy ghế cuối. Khoá theo thứ tự id: đơn
     * khứ hồi khoá hai dòng, khoá theo cùng một thứ tự thì hai đơn ngược chiều nhau không deadlock. KHÔNG join fetch ở
     * đây (sẽ khoá luôn cả dòng hãng bay và sân bay).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from FlightSchedule s where s.id in :ids order by s.id")
    List<FlightSchedule> lockAllByIdIn(@Param("ids") Collection<Long> ids);

    /**
     * Ghế đã bán của các lịch bay trong ngày {@code date}, hạng {@code cabin} = số hành khách KHÔNG phải em bé của các
     * đơn chưa huỷ. Entity đơn được gọi bằng tên trong JPQL để package flight không phụ thuộc package booking khi biên
     * dịch (booking đã phụ thuộc flight): tránh vòng phụ thuộc.
     */
    @Query("select s.scheduleId as scheduleId, count(t.id) as seats " + OCCUPIED_SEATS + """
              and s.scheduleId in :scheduleIds and s.flightDate = :date and f.cabin = :cabin
            group by s.scheduleId
            """)
    List<BookedSeats> countBookedSeats(@Param("scheduleIds") Collection<Long> scheduleIds,
            @Param("date") LocalDate date, @Param("cabin") CabinClass cabin);

    interface DailyBookedSeats {
        CabinClass getCabin();

        long getSeats();
    }

    interface BookedSeats {
        Long getScheduleId();

        Long getSeats();
    }
}
