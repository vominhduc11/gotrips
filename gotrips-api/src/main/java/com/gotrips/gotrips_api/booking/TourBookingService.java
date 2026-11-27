package com.gotrips.gotrips_api.booking;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.gotrips.gotrips_api.common.catalog.CatalogStatus;
import com.gotrips.gotrips_api.common.error.ConflictException;
import com.gotrips.gotrips_api.common.error.InvalidRequestException;
import com.gotrips.gotrips_api.tour.TourDeparture;
import com.gotrips.gotrips_api.tour.TourDepartureRepository;
import com.gotrips.gotrips_api.tour.TourRepository;

import lombok.RequiredArgsConstructor;

/**
 * Đặt tour. Kiểm lại toàn bộ (không tin client), tự tính giá từ chuyến khởi hành rồi chốt vào đơn, và giữ chỗ bằng
 * UPDATE có điều kiện nên hai đơn đồng thời không bán quá số chỗ. Câu báo lỗi khớp gotrips-web
 * ({@code lib/schemas/booking.ts}): đổi một nơi phải đổi nơi kia.
 */
@Service
@RequiredArgsConstructor
public class TourBookingService {

    private static final String MISSING_MESSAGE =
            "Chuyến khởi hành này không còn tồn tại. Bạn vui lòng chọn ngày khác.";
    private static final String CLOSED_MESSAGE = "Chuyến này đã đóng đặt chỗ. Bạn vui lòng chọn ngày khác.";
    private static final String SOLD_OUT_MESSAGE = "Chuyến này đã hết chỗ. Bạn vui lòng chọn ngày khác.";

    private final BookingTransaction transaction;
    private final BookingAccounts accounts;
    private final BookingRepository bookingRepository;
    private final TourBookingDetailRepository tourDetailRepository;
    private final TourDepartureRepository departureRepository;
    private final TourRepository tourRepository;
    private final BookingCodeGenerator codeGenerator;
    private final BookingAssembler assembler;
    private final Clock clock;

    public BookingDetailResponse create(UUID userId, CreateTourBookingRequest request) {
        return transaction.run(() -> createInTransaction(userId, request));
    }

    private BookingDetailResponse createInTransaction(UUID userId, CreateTourBookingRequest request) {
        accounts.requireExisting(userId);
        LocalDate today = LocalDate.now(clock);
        int guests = request.guests();
        validateTravelers(request.travelers(), guests, today);

        // Khoá tour rồi mới khoá chuyến (cùng thứ tự với thao tác của admin) và đọc SAU khi có khoá: không đặt được vào
        // tour vừa bị ẩn/xoá hay chuyến vừa bị đóng bán, đổi giá, xoá.
        Long tourId = departureRepository.findTourId(request.departureId())
                .orElseThrow(TourBookingService::missingDeparture);
        // Tour đang ẩn hoặc đã xoá coi như chuyến không tồn tại (không lộ tour ẩn).
        tourRepository.lockForBooking(tourId)
                .filter(tour -> tour.getStatus() == CatalogStatus.ACTIVE)
                .orElseThrow(TourBookingService::missingDeparture);
        TourDeparture departure = departureRepository.lockById(request.departureId())
                .orElseThrow(TourBookingService::missingDeparture);
        // Đặt trực tuyến chỉ từ ngày mai, và chỉ khi chuyến còn mở bán.
        if (!departure.getDepartureDate().isAfter(today) || departure.isSalesClosed()) {
            throw new InvalidRequestException("departureId", CLOSED_MESSAGE);
        }

        long unitPrice = departure.getPrice();
        if (departureRepository.reserveSeats(departure.getId(), guests) == 0) {
            throw soldOut(departureRepository.findSeatsLeft(departure.getId()).orElse(0));
        }

        Booking booking = Booking.pending(
                BookingCodeGenerator.unique(codeGenerator::next, bookingRepository::existsByCode), userId,
                BookingKind.TOUR, unitPrice * guests, request.contact(), request.note(), clock.instant());
        request.travelers().forEach(t -> booking.addTraveler(null, t.fullName(), t.dateOfBirth()));
        bookingRepository.save(booking);
        tourDetailRepository.save(new TourBookingDetail(booking, departure.getId(), guests, unitPrice));
        return assembler.detail(booking);
    }

    private static void validateTravelers(List<TravelerRequest> travelers, int guests, LocalDate today) {
        if (travelers.size() != guests) {
            throw new InvalidRequestException("travelers", BookingValidation.TRAVELER_COUNT_MESSAGE);
        }
        for (int i = 0; i < travelers.size(); i++) {
            LocalDate dateOfBirth = travelers.get(i).dateOfBirth();
            if (dateOfBirth != null && dateOfBirth.isAfter(today)) {
                throw new InvalidRequestException("travelers[" + i + "].dateOfBirth",
                        PassengerRules.BIRTH_DATE_IN_FUTURE_MESSAGE);
            }
        }
    }

    private static InvalidRequestException missingDeparture() {
        return new InvalidRequestException("departureId", MISSING_MESSAGE);
    }

    private static ConflictException soldOut(int seatsLeft) {
        return new ConflictException("guests", seatsLeft > 0
                ? "Chuyến này chỉ còn " + seatsLeft + " chỗ. Bạn vui lòng giảm số khách hoặc chọn ngày khác."
                : SOLD_OUT_MESSAGE);
    }
}
