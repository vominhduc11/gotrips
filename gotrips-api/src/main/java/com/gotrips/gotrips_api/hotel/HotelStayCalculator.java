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

import com.gotrips.gotrips_api.common.error.InvalidRequestException;

/**
 * Luật tìm khách sạn và tính tiền lưu trú: hàm thuần (không DB, không {@code Clock}; "hôm nay" là tham số) nên test
 * được trực tiếp. Chép nguyên văn từ {@code lib/data/hotel-view.ts} của web, nay API là nguồn duy nhất cho phần tìm
 * kiếm (web chỉ còn giữ các hàm nhỏ phục vụ tạm tính ngay trên giao diện).
 */
public final class HotelStayCalculator {

    /** Số đêm tối đa mỗi lần đặt. */
    public static final int MAX_NIGHTS = 30;
    /** Số khách tối đa mỗi lần đặt. */
    public static final int MAX_GUESTS = 30;
    /** Số phòng tối đa mỗi lần đặt. */
    public static final int MAX_ROOMS = 10;

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

    /** Phòng rẻ nhất chứa đủ khách; không phòng nào chứa đủ thì rỗng. */
    public static Optional<HotelRoomType> findCheapestFittingRoom(Collection<HotelRoomType> roomTypes, int guests,
            int rooms) {
        return sortRoomTypes(roomTypes).stream().filter(room -> roomFitsGuests(room, guests, rooms)).findFirst();
    }

    /** Giá một đêm thấp nhất trong MỌI loại phòng của khách sạn ("giá từ" của thẻ), rỗng nếu chưa có phòng. */
    public static OptionalLong minPricePerNight(Collection<HotelRoomType> roomTypes) {
        return roomTypes.stream().mapToLong(HotelRoomType::getPricePerNight).min();
    }

    /**
     * Khách sạn của một điểm đến còn phòng cho lượt tìm. Chỉ giữ khách sạn ACTIVE (người gọi đã lọc theo trạng thái);
     * khách sạn không có loại phòng nào đủ chỗ thì bị bỏ. Sắp theo tổng tiền tăng dần, rồi điểm đánh giá giảm dần,
     * rồi id. Không phân trang.
     */
    public static List<Entry> search(List<Hotel> hotels, Map<Long, List<HotelRoomType>> roomTypesByHotel,
            Criteria criteria) {
        int nights = countNights(criteria.checkIn(), criteria.checkOut());
        List<Entry> entries = new ArrayList<>();
        for (Hotel hotel : hotels) {
            List<HotelRoomType> roomTypes = roomTypesByHotel.getOrDefault(hotel.getId(), List.of());
            OptionalLong minPrice = minPricePerNight(roomTypes);
            Optional<HotelRoomType> room = findCheapestFittingRoom(roomTypes, criteria.guests(), criteria.rooms());
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
