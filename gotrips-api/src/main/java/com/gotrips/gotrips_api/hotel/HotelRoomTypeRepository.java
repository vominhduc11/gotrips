package com.gotrips.gotrips_api.hotel;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

public interface HotelRoomTypeRepository extends JpaRepository<HotelRoomType, Long> {

    /** Các loại công khai, chỉ gồm loại còn mở bán. */
    List<HotelRoomType> findByHotelIdInAndTotalRoomsGreaterThan(Collection<Long> hotelIds, int capacity);

    List<HotelRoomType> findByHotelIdAndTotalRoomsGreaterThan(Long hotelId, int capacity);

    List<HotelRoomType> findByHotelId(Long hotelId);

    /**
     * Chỉ lấy id khách sạn (giá trị vô hướng) để khoá khách sạn TRƯỚC khi đụng tới loại phòng. Cố ý không nạp entity:
     * entity đã nằm trong persistence context thì câu khoá sau đó trả lại bản cũ, không đọc lại dữ liệu. Đọc không khoá
     * vẫn an toàn vì {@code hotel_id} không bao giờ đổi.
     */
    @Query("select r.hotelId from HotelRoomType r where r.id = :id")
    Optional<Long> findHotelId(@Param("id") Long id);

    /** Đếm toàn bộ loại, đồng thời lấy số loại đang bán và giá thấp nhất của chúng. */
    @Query("""
            select r.hotelId as hotelId, count(r) as roomTypeCount,
              count(case when r.totalRooms > 0 then 1 else null end) as sellingRoomTypeCount,
              min(case when r.totalRooms > 0 then r.pricePerNight else null end) as minPricePerNight
            from HotelRoomType r where r.hotelId in :hotelIds group by r.hotelId
            """)
    List<RoomStats> findRoomStatsByHotelIds(@Param("hotelIds") Collection<Long> hotelIds);

    /**
     * Các kỳ lưu trú còn giữ phòng từ đêm {@code today} trở đi (đơn chưa huỷ, ngày trả sau {@code today}), để tính số
     * phòng bị giữ cao nhất trong một đêm ({@link HotelStayCalculator#peakRoomsHeld}). Tên entity trong JPQL: xem
     * {@link #countBookedRooms}.
     */
    @Query("""
            select h.roomTypeId as roomTypeId, h.checkIn as checkIn, h.checkOut as checkOut, h.rooms as rooms
            from HotelBookingDetail h
            join h.booking b
            where h.roomTypeId in :roomTypeIds
              and h.checkOut > :today
              and b.status <> com.gotrips.gotrips_api.booking.BookingStatus.CANCELLED
            """)
    List<HeldStay> findHeldStays(@Param("roomTypeIds") Collection<Long> roomTypeIds, @Param("today") LocalDate today);

    /** Id các loại phòng đã TỪNG có đơn, kể cả đơn đã huỷ hay đã ở xong: những loại này không xoá được. */
    @Query("select distinct h.roomTypeId from HotelBookingDetail h where h.roomTypeId in :roomTypeIds")
    List<Long> findEverBookedIds(@Param("roomTypeIds") Collection<Long> roomTypeIds);

    /**
     * Khoá dòng loại phòng tới hết transaction: hai đơn đồng thời cùng loại phòng phải chờ nhau, nên đơn sau đếm được
     * phòng đơn trước đã giữ. Phải khoá khách sạn trước ({@link HotelRepository}).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from HotelRoomType r where r.id = :id")
    Optional<HotelRoomType> lockById(@Param("id") Long id);

    /**
     * Số phòng đã đặt của từng loại phòng trong các đơn chưa huỷ có khoảng ngày giao [checkIn, checkOut). Ngày trả của
     * đơn này bằng ngày nhận của đơn kia thì KHÔNG giao. Entity đơn được gọi bằng tên trong JPQL để package hotel không
     * phụ thuộc package booking khi biên dịch (booking đã phụ thuộc hotel): tránh vòng phụ thuộc.
     */
    @Query("""
            select h.roomTypeId as roomTypeId, sum(h.rooms) as rooms
            from HotelBookingDetail h
            join h.booking b
            where h.roomTypeId in :roomTypeIds
              and h.checkIn < :checkOut and h.checkOut > :checkIn
              and b.status <> com.gotrips.gotrips_api.booking.BookingStatus.CANCELLED
            group by h.roomTypeId
            """)
    List<BookedRooms> countBookedRooms(@Param("roomTypeIds") Collection<Long> roomTypeIds,
            @Param("checkIn") LocalDate checkIn, @Param("checkOut") LocalDate checkOut);

    interface BookedRooms {
        Long getRoomTypeId();

        Long getRooms();
    }

    interface RoomStats {
        Long getHotelId();

        Long getRoomTypeCount();

        Long getSellingRoomTypeCount();

        Long getMinPricePerNight();
    }

    interface HeldStay {
        Long getRoomTypeId();

        LocalDate getCheckIn();

        LocalDate getCheckOut();

        Integer getRooms();
    }
}
