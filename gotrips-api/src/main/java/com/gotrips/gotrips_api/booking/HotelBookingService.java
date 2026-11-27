package com.gotrips.gotrips_api.booking;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.gotrips.gotrips_api.common.catalog.CatalogStatus;
import com.gotrips.gotrips_api.common.error.ConflictException;
import com.gotrips.gotrips_api.common.error.InvalidRequestException;
import com.gotrips.gotrips_api.hotel.HotelRepository;
import com.gotrips.gotrips_api.hotel.HotelRoomInventory;
import com.gotrips.gotrips_api.hotel.HotelRoomType;
import com.gotrips.gotrips_api.hotel.HotelRoomTypeRepository;
import com.gotrips.gotrips_api.hotel.HotelStayCalculator;

import lombok.RequiredArgsConstructor;

/**
 * Đặt phòng khách sạn. Kiểm lại toàn bộ (không tin client), tự tính giá rồi chốt vào đơn. Khoá chia sẻ khách sạn rồi
 * khoá ghi dòng loại phòng trước khi đếm phòng đã đặt: hai đơn đồng thời không giữ quá số phòng, và đơn không chen
 * ngang lệnh ẩn, xoá hay đổi số phòng của admin. Câu báo lỗi khớp gotrips-web
 * ({@code lib/schemas/hotel-booking.ts}, {@code hotel-search.ts}): đổi một nơi phải đổi nơi kia.
 */
@Service
@RequiredArgsConstructor
public class HotelBookingService {

    private static final String ROOM_MESSAGE = "Vui lòng chọn loại phòng.";
    private static final String HOTEL_CLOSED_MESSAGE = "Khách sạn này hiện không nhận đặt phòng.";
    private static final String NO_ROOM_MESSAGE =
            "Loại phòng này đã hết phòng trong khoảng ngày đã chọn. Bạn vui lòng đổi ngày hoặc chọn loại phòng khác.";

    private final BookingTransaction transaction;
    private final BookingAccounts accounts;
    private final BookingRepository bookingRepository;
    private final HotelBookingDetailRepository hotelDetailRepository;
    private final HotelRoomTypeRepository roomTypeRepository;
    private final HotelRepository hotelRepository;
    private final HotelRoomInventory roomInventory;
    private final BookingCodeGenerator codeGenerator;
    private final BookingAssembler assembler;
    private final Clock clock;

    public BookingDetailResponse create(UUID userId, CreateHotelBookingRequest request) {
        return transaction.run(() -> createInTransaction(userId, request));
    }

    private BookingDetailResponse createInTransaction(UUID userId, CreateHotelBookingRequest request) {
        accounts.requireExisting(userId);
        LocalDate today = LocalDate.now(clock);
        int guests = request.guests();
        int rooms = request.rooms();

        // Một thứ tự khoá cho mọi luồng, giống thao tác của admin: khách sạn rồi mới tới loại phòng. Lấy id khách sạn
        // bằng truy vấn vô hướng để chưa entity nào vào persistence context trước khi bị khoá.
        Long hotelId = roomTypeRepository.findHotelId(request.roomTypeId())
                .orElseThrow(HotelBookingService::unknownRoom);
        // Khoá chia sẻ và đọc trạng thái SAU khi có khoá: không đặt được vào khách sạn vừa bị ẩn hoặc xoá.
        hotelRepository.lockForBooking(hotelId)
                .filter(hotel -> hotel.getStatus() == CatalogStatus.ACTIVE)
                .orElseThrow(() -> new InvalidRequestException("roomTypeId", HOTEL_CLOSED_MESSAGE));
        // Khoá TRƯỚC khi đọc bất cứ gì của loại phòng: giá, số phòng và các đơn đã đặt đọc sau đó đều là bản mới nhất.
        HotelRoomType roomType = roomTypeRepository.lockById(request.roomTypeId())
                .orElseThrow(HotelBookingService::unknownRoom);

        HotelStayCalculator.validateStay(request.checkIn(), request.checkOut(), guests, rooms, today);
        HotelStayCalculator.validateBookingCheckIn(request.checkIn(), today);
        if (!HotelStayCalculator.roomFitsGuests(roomType, guests, rooms)) {
            throw new InvalidRequestException("guests", "Loại phòng này ở tối đa " + roomType.getMaxGuests()
                    + " khách mỗi phòng. Bạn vui lòng tăng số phòng hoặc chọn loại phòng khác.");
        }

        long booked = roomInventory.bookedRooms(List.of(roomType.getId()), request.checkIn(), request.checkOut())
                .getOrDefault(roomType.getId(), 0L);
        int available = HotelStayCalculator.availableRooms(roomType.getTotalRooms(), booked);
        if (available < rooms) {
            throw new ConflictException("rooms", available > 0
                    ? "Loại phòng này chỉ còn " + available + " phòng trống trong khoảng ngày đã chọn. "
                            + "Bạn vui lòng giảm số phòng, đổi ngày hoặc chọn loại phòng khác."
                    : NO_ROOM_MESSAGE);
        }

        int nights = HotelStayCalculator.countNights(request.checkIn(), request.checkOut());
        long total = HotelStayCalculator.computeStayTotal(roomType.getPricePerNight(), nights, rooms);
        Booking booking = Booking.pending(
                BookingCodeGenerator.unique(codeGenerator::next, bookingRepository::existsByCode), userId,
                BookingKind.HOTEL, total, request.contact(), request.note(), clock.instant());
        bookingRepository.save(booking);
        hotelDetailRepository.save(HotelBookingDetail.builder()
                .booking(booking)
                .roomTypeId(roomType.getId())
                .checkIn(request.checkIn())
                .checkOut(request.checkOut())
                .nights(nights)
                .rooms(rooms)
                .guests(guests)
                .pricePerNight(roomType.getPricePerNight())
                .guestName(request.guestName())
                .build());
        return assembler.detail(booking);
    }

    /** Mã loại phòng không có, hoặc loại phòng vừa bị admin xoá trong lúc đơn chờ khoá. */
    private static InvalidRequestException unknownRoom() {
        return new InvalidRequestException("roomTypeId", ROOM_MESSAGE);
    }
}
