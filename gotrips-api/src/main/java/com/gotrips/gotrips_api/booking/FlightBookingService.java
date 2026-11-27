package com.gotrips.gotrips_api.booking;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.gotrips.gotrips_api.common.error.ConflictException;
import com.gotrips.gotrips_api.common.error.InvalidRequestException;
import com.gotrips.gotrips_api.flight.CabinClass;
import com.gotrips.gotrips_api.flight.FlightFareCalculator;
import com.gotrips.gotrips_api.flight.FlightFaresResponse;
import com.gotrips.gotrips_api.flight.FlightSchedule;
import com.gotrips.gotrips_api.flight.FlightScheduleRepository;
import com.gotrips.gotrips_api.flight.FlightSearchRules;
import com.gotrips.gotrips_api.flight.FlightSeatInventory;

import lombok.RequiredArgsConstructor;

/**
 * Đặt vé máy bay. Kiểm lại toàn bộ (không tin client): chiều bay của từng lịch bay, số hành khách từng loại và tuổi
 * theo ngày bay chiều đi; tự tính giá rồi chốt vào đơn. Khoá các dòng lịch bay trước khi đếm ghế nên hai đơn đồng thời
 * không bán quá số ghế. Câu báo lỗi khớp gotrips-web ({@code lib/schemas/flight-search.ts},
 * {@code flight-booking.ts}): đổi một nơi phải đổi nơi kia.
 */
@Service
@RequiredArgsConstructor
public class FlightBookingService {

    private static final String SAME_DAY_MESSAGE =
            "Chuyến bay trong ngày hôm nay đã đóng đặt vé trực tuyến. Bạn vui lòng chọn ngày khác.";
    private static final String MISSING_FLIGHT_MESSAGE =
            "Chuyến bay đã chọn không còn khai thác. Bạn vui lòng chọn chuyến khác.";

    private final BookingTransaction transaction;
    private final BookingAccounts accounts;
    private final BookingRepository bookingRepository;
    private final FlightBookingDetailRepository flightDetailRepository;
    private final FlightScheduleRepository scheduleRepository;
    private final FlightSeatInventory seatInventory;
    private final BookingCodeGenerator codeGenerator;
    private final BookingAssembler assembler;
    private final Clock clock;

    /** Một chặng khách chọn; {@code field} là trường nhận lỗi của chặng đó. */
    private record Leg(long scheduleId, String from, String to, LocalDate date, String field) {
    }

    public BookingDetailResponse create(UUID userId, CreateFlightBookingRequest request) {
        return transaction.run(() -> createInTransaction(userId, request));
    }

    private BookingDetailResponse createInTransaction(UUID userId, CreateFlightBookingRequest request) {
        accounts.requireExisting(userId);
        LocalDate today = LocalDate.now(clock);
        validateTrip(request, today);
        List<PassengerType> types = validatePassengers(request.passengers(), request.departDate(), today);

        List<Leg> legs = legs(request);
        // Khoá TRƯỚC khi đếm ghế (theo thứ tự id, xem repository).
        Map<Long, FlightSchedule> schedules = scheduleRepository
                .lockAllByIdIn(legs.stream().map(Leg::scheduleId).distinct().toList()).stream()
                .collect(Collectors.toMap(FlightSchedule::getId, Function.identity()));
        for (Leg leg : legs) {
            requireRoute(schedules.get(leg.scheduleId()), leg);
        }
        // Em bé ngồi cùng người lớn nên không chiếm ghế.
        int seatsNeeded = (int) types.stream().filter(type -> type != PassengerType.INFANT).count();
        for (Leg leg : legs) {
            requireSeats(schedules.get(leg.scheduleId()), leg, request.cabin(), seatsNeeded);
        }

        List<FlightFaresResponse> fares = new ArrayList<>();
        for (Leg leg : legs) {
            fares.add(FlightFareCalculator.fares(schedules.get(leg.scheduleId()).getEconomyFare(), request.cabin()));
        }
        long total = FlightPricing.total(FlightPricing.priceLines(fares, types));

        Booking booking = Booking.pending(
                BookingCodeGenerator.unique(codeGenerator::next, bookingRepository::existsByCode), userId,
                BookingKind.FLIGHT, total, request.contact(), request.note(), clock.instant());
        request.passengers().forEach(p -> booking.addTraveler(p.type(), p.fullName(), p.dateOfBirth()));
        bookingRepository.save(booking);

        FlightBookingDetail detail = new FlightBookingDetail(booking, request.cabin());
        for (int i = 0; i < legs.size(); i++) {
            detail.addSegment(legs.get(i).scheduleId(), legs.get(i).date(), fares.get(i));
        }
        flightDetailRepository.save(detail);
        return assembler.detail(booking);
    }

    private static void validateTrip(CreateFlightBookingRequest request, LocalDate today) {
        FlightSearchRules.validateRoute(request.from(), request.to());
        FlightSearchRules.validateNotPast("departDate", request.departDate(), today);
        // Đặt trực tuyến chỉ từ ngày mai.
        if (!request.departDate().isAfter(today)) {
            throw new InvalidRequestException("departDate", SAME_DAY_MESSAGE);
        }
        if (request.returnScheduleId() == null && request.returnDate() == null) {
            return;
        }
        if (request.returnScheduleId() == null) {
            throw new InvalidRequestException("returnScheduleId", "Vui lòng chọn chuyến về.");
        }
        if (request.returnDate() == null) {
            throw new InvalidRequestException("returnDate", "Vui lòng chọn ngày về.");
        }
        if (request.returnDate().isBefore(request.departDate())) {
            throw new InvalidRequestException("returnDate", "Ngày về không được trước ngày đi.");
        }
    }

    private static List<PassengerType> validatePassengers(List<PassengerRequest> passengers, LocalDate departDate,
            LocalDate today) {
        List<PassengerType> types = passengers.stream().map(PassengerRequest::type).toList();
        FlightSearchRules.validatePassengerCounts(count(types, PassengerType.ADULT), count(types, PassengerType.CHILD),
                count(types, PassengerType.INFANT), "passengers", "passengers");
        for (int i = 0; i < passengers.size(); i++) {
            PassengerRequest passenger = passengers.get(i);
            PassengerRules.validate(passenger.type(), passenger.dateOfBirth(), departDate, today,
                    "passengers[" + i + "].dateOfBirth");
        }
        return types;
    }

    private static int count(List<PassengerType> types, PassengerType type) {
        return (int) types.stream().filter(type::equals).count();
    }

    private static List<Leg> legs(CreateFlightBookingRequest request) {
        Leg outbound = new Leg(request.outboundScheduleId(), request.from(), request.to(), request.departDate(),
                "outboundScheduleId");
        if (request.returnScheduleId() == null) {
            return List.of(outbound);
        }
        return List.of(outbound, new Leg(request.returnScheduleId(), request.to(), request.from(),
                request.returnDate(), "returnScheduleId"));
    }

    /** Id do trình duyệt gửi nên phải đúng chiều bay, nếu không "chiều về" có thể là một chuyến bất kỳ. */
    private static void requireRoute(FlightSchedule schedule, Leg leg) {
        if (schedule == null || !schedule.getFromAirport().getCode().equals(leg.from())
                || !schedule.getToAirport().getCode().equals(leg.to())) {
            throw new InvalidRequestException(leg.field(), MISSING_FLIGHT_MESSAGE);
        }
    }

    private void requireSeats(FlightSchedule schedule, Leg leg, CabinClass cabin, int needed) {
        long booked = seatInventory.bookedSeats(List.of(schedule.getId()), leg.date(), cabin)
                .getOrDefault(schedule.getId(), 0L);
        int seatsLeft = FlightSeatInventory.seatsLeft(schedule.seatCapacity(cabin), booked);
        if (seatsLeft >= needed) {
            return;
        }
        throw new ConflictException(leg.field(), seatsLeft > 0
                ? "Chuyến " + schedule.getFlightNumber() + " chỉ còn " + seatsLeft + " ghế ở hạng đã chọn. "
                        + "Bạn vui lòng chọn chuyến khác hoặc giảm số hành khách."
                : "Chuyến " + schedule.getFlightNumber()
                        + " đã hết ghế ở hạng đã chọn. Bạn vui lòng chọn chuyến khác.");
    }
}
