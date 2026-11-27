package com.gotrips.gotrips_api.hotel;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.OptionalLong;
import java.util.TreeMap;

import com.gotrips.gotrips_api.common.error.InvalidRequestException;

/**
 * Luật tìm khách sạn, phòng trống và tính tiền lưu trú: hàm thuần (không DB, không {@code Clock}; "hôm nay" là tham số)
 * nên test được trực tiếp. API là nguồn duy nhất của các luật này (web chỉ còn các hàm nhỏ phục vụ tạm tính ngay trên
 * giao diện). Câu báo lỗi khớp {@code lib/schemas/hotel-search.ts} và {@code hotel-booking.ts} của web: đổi một nơi
 * phải đổi nơi kia.
 */
public final class HotelStayCalculator {

    /** Số đêm tối đa mỗi lần đặt. */
    public static final int MAX_NIGHTS = 30;
    /** Số khách tối đa mỗi lần đặt. */
    public static final int MAX_GUESTS = 30;
    /** Số phòng tối đa mỗi lần đặt. */
    public static final int MAX_ROOMS = 10;
    /** Đặt phòng (khác tìm kiếm) chỉ nhận phòng từ ngày mai. */
    public static final String SAME_DAY_CHECK_IN_MESSAGE =
            "Đặt phòng trực tuyến chỉ nhận phòng từ ngày mai. Bạn vui lòng chọn ngày khác.";

    private HotelStayCalculator() {
    }

    /** Điều kiện tìm: khoảng ngày lưu trú, số khách, số phòng (đã qua {@link #validateStay}). */
    public record Criteria(LocalDate checkIn, LocalDate checkOut, int guests, int rooms) {
    }

    /** Một khách sạn trong kết quả: phòng rẻ nhất còn đủ chỗ và tổng tiền cả kỳ. */
    public record Entry(Hotel hotel, long minPricePerNight, HotelRoomType room, int nights, int rooms, long totalPrice) {
    }

    /**
     * Kiểm luật của lượt tìm, theo đúng thứ tự và câu chữ của {@code checkStayDates} ở web: ngày nhận không ở quá khứ,
     * ngày trả sau ngày nhận, tối đa {@value #MAX_NIGHTS} đêm, rồi số phòng không nhiều hơn số khách. Ném
     * {@link InvalidRequestException} (400) ở lỗi đầu tiên gặp.
     */
    public static void validateStay(LocalDate checkIn, LocalDate checkOut, int guests, int rooms, LocalDate today) {
        if (checkIn.isBefore(today)) {
            throw new InvalidRequestException("checkIn", "Ngày nhận phòng không được ở quá khứ.");
        }
        if (!checkOut.isAfter(checkIn)) {
            throw new InvalidRequestException("checkOut", "Ngày trả phòng phải sau ngày nhận phòng.");
        }
        if (countNights(checkIn, checkOut) > MAX_NIGHTS) {
            throw new InvalidRequestException("checkOut", "Mỗi lần đặt tối đa " + MAX_NIGHTS + " đêm.");
        }
        if (rooms > guests) {
            throw new InvalidRequestException("rooms", "Số phòng không được nhiều hơn số khách.");
        }
    }

    /**
     * Luật thêm khi TẠO ĐƠN (sau {@link #validateStay}): nhận phòng ngay hôm nay đã đóng đặt trực tuyến, dù vẫn tìm được.
     */
    public static void validateBookingCheckIn(LocalDate checkIn, LocalDate today) {
        if (!checkIn.isAfter(today)) {
            throw new InvalidRequestException("checkIn", SAME_DAY_CHECK_IN_MESSAGE);
        }
    }

    /**
     * Số phòng còn trống trong một khoảng ngày = tổng số phòng − số phòng của các đơn chưa huỷ có khoảng ngày GIAO với
     * khoảng đó, không âm. Cách đếm này thận trọng: hai đơn không trùng đêm nhau nhưng cùng giao khoảng hỏi vẫn bị cộng
     * cả hai.
     */
    public static int availableRooms(int totalRooms, long bookedRooms) {
        return (int) Math.max(0, totalRooms - bookedRooms);
    }

    /** Một kỳ lưu trú đang giữ {@code rooms} phòng trong các đêm của {@code [checkIn, checkOut)}. */
    public record Stay(LocalDate checkIn, LocalDate checkOut, int rooms) {
    }

    /**
     * Số phòng bị giữ cao nhất trong MỘT đêm kể từ đêm {@code today}: mức thấp nhất mà tổng số phòng được phép giảm tới.
     * Khác {@link #availableRooms} (cộng mọi đơn giao với cả khoảng), ở đây hai kỳ không chung đêm nào thì không cộng
     * dồn. Ngày trả phòng không còn giữ phòng, nên kỳ trả và kỳ nhận cùng một ngày không chồng nhau. Nơi gọi chỉ đưa vào
     * các kỳ của đơn chưa huỷ.
     */
    public static int peakRoomsHeld(Collection<Stay> stays, LocalDate today) {
        // Mỗi mốc ngày giữ thay đổi RÒNG số phòng, nên trả và nhận cùng ngày tự bù trừ trước khi so với đỉnh.
        TreeMap<LocalDate, Integer> changes = new TreeMap<>();
        for (Stay stay : stays) {
            LocalDate from = stay.checkIn().isBefore(today) ? today : stay.checkIn();
            if (!stay.checkOut().isAfter(from)) {
                continue;
            }
            changes.merge(from, stay.rooms(), Integer::sum);
            changes.merge(stay.checkOut(), -stay.rooms(), Integer::sum);
        }
        int held = 0;
        int peak = 0;
        for (int change : changes.values()) {
            held += change;
            peak = Math.max(peak, held);
        }
        return peak;
    }

    public static int countNights(LocalDate checkIn, LocalDate checkOut) {
        return (int) ChronoUnit.DAYS.between(checkIn, checkOut);
    }

    /** Tổng tiền cả kỳ = giá một phòng một đêm × số đêm × số phòng. */
    public static long computeStayTotal(long pricePerNight, int nights, int rooms) {
        return pricePerNight * nights * rooms;
    }

    /**
     * Loại phòng chứa đủ khách khi đặt {@code rooms} phòng: mỗi phòng ít nhất 1 khách, nhiều nhất {@code maxGuests}
     * (nên {@code rooms ≤ guests ≤ maxGuests × rooms}).
     */
    public static boolean roomFitsGuests(HotelRoomType room, int guests, int rooms) {
        return rooms >= 1 && rooms <= guests && guests <= (long) room.getMaxGuests() * rooms;
    }

    /** Loại phòng sắp theo giá tăng dần, rồi id. Không sửa tập đầu vào. */
    public static List<HotelRoomType> sortRoomTypes(Collection<HotelRoomType> roomTypes) {
        return roomTypes.stream()
                .sorted(Comparator.comparingLong(HotelRoomType::getPricePerNight).thenComparing(HotelRoomType::getId))
                .toList();
    }

    /** Giá một đêm thấp nhất trong các loại đang bán, độc lập với số phòng trống của lượt tìm. */
    public static OptionalLong minPricePerNight(Collection<HotelRoomType> roomTypes) {
        return roomTypes.stream().filter(room -> room.getTotalRooms() > 0)
                .mapToLong(HotelRoomType::getPricePerNight).min();
    }

    /** Phòng rẻ nhất chứa đủ khách VÀ còn đủ phòng trống cho cả kỳ; không loại nào như vậy thì rỗng. */
    public static Optional<HotelRoomType> findCheapestAvailableRoom(Collection<HotelRoomType> roomTypes,
            Map<Long, Long> bookedRoomsByType, int guests, int rooms) {
        return sortRoomTypes(roomTypes).stream()
                .filter(room -> roomFitsGuests(room, guests, rooms))
                .filter(room -> availableRooms(room.getTotalRooms(),
                        bookedRoomsByType.getOrDefault(room.getId(), 0L)) >= rooms)
                .findFirst();
    }

    /**
     * Khách sạn của một điểm đến còn phòng cho lượt tìm. Chỉ giữ khách sạn ACTIVE (người gọi đã lọc theo trạng thái);
     * khách sạn không có loại phòng nào vừa đủ chỗ vừa còn đủ phòng trống thì bị bỏ. Sắp theo tổng tiền tăng dần, rồi
     * điểm đánh giá giảm dần, rồi id. Không phân trang.
     *
     * @param bookedRoomsByType số phòng đã đặt (giao khoảng ngày) theo id loại phòng; loại chưa đặt thì không có
     */
    public static List<Entry> search(List<Hotel> hotels, Map<Long, List<HotelRoomType>> roomTypesByHotel,
            Map<Long, Long> bookedRoomsByType, Criteria criteria) {
        int nights = countNights(criteria.checkIn(), criteria.checkOut());
        List<Entry> entries = new ArrayList<>();
        for (Hotel hotel : hotels) {
            List<HotelRoomType> roomTypes = roomTypesByHotel.getOrDefault(hotel.getId(), List.of());
            OptionalLong minPrice = minPricePerNight(roomTypes);
            Optional<HotelRoomType> room = findCheapestAvailableRoom(roomTypes, bookedRoomsByType, criteria.guests(),
                    criteria.rooms());
            if (minPrice.isEmpty() || room.isEmpty()) {
                continue;
            }
            entries.add(new Entry(hotel, minPrice.getAsLong(), room.get(), nights, criteria.rooms(),
                    computeStayTotal(room.get().getPricePerNight(), nights, criteria.rooms())));
        }

        entries.sort(Comparator.comparingLong(Entry::totalPrice)
                .thenComparing((Entry e) -> e.hotel().getRating(), Comparator.reverseOrder())
                .thenComparing(e -> e.hotel().getId()));
        return entries;
    }
}
