package com.gotrips.gotrips_api.flight;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gotrips.gotrips_api.catalog.WebCatalogChanged;
import com.gotrips.gotrips_api.common.error.ConflictException;
import com.gotrips.gotrips_api.common.error.ConstraintViolations;
import com.gotrips.gotrips_api.common.error.InvalidRequestException;
import com.gotrips.gotrips_api.common.error.ResourceNotFoundException;
import com.gotrips.gotrips_api.flight.AdminFlightScheduleDtos.AdminCreateFlightScheduleRequest;
import com.gotrips.gotrips_api.flight.AdminFlightScheduleDtos.AdminFlightSchedulePageResponse;
import com.gotrips.gotrips_api.flight.AdminFlightScheduleDtos.AdminFlightScheduleResponse;
import com.gotrips.gotrips_api.flight.AdminFlightScheduleDtos.AdminUpdateFlightScheduleRequest;
import com.gotrips.gotrips_api.flight.AdminFlightScheduleDtos.ScheduleFields;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AdminFlightScheduleService {

    private static final String BOOKED_TIMING = "Lịch bay từng có đơn nên giờ bay phải giữ nguyên.";
    private static final String BOOKED_DELETE = "Lịch bay từng có đơn nên không thể xoá.";

    private final FlightScheduleRepository schedules;
    private final AirlineRepository airlines;
    private final AirportRepository airports;
    private final FlightMapper mapper;
    private final Clock clock;
    private final ApplicationEventPublisher events;

    @Transactional(readOnly = true)
    public AdminFlightSchedulePageResponse list(String fromCode, String toCode, String airlineCode, int requestedPage,
            int size, AdminFlightScheduleSort sort) {
        long total = schedules.countAdmin(fromCode, toCode, airlineCode);
        long totalPages = Math.max(1L, Math.ceilDiv(total, size));
        int page = (int) Math.min(requestedPage, totalPages);
        if (total == 0) {
            return new AdminFlightSchedulePageResponse(List.of(), page, size, 0, totalPages);
        }

        var rows = schedules.findAdminPage(fromCode, toCode, airlineCode, PageRequest.of(page - 1, size, sort.order()));
        if (rows.isEmpty()) {
            return new AdminFlightSchedulePageResponse(List.of(), page, size, total, totalPages);
        }
        var bookedIds = new HashSet<>(schedules.findEverBookedIds(rows.stream().map(FlightSchedule::getId).toList()));
        var items = rows.stream().map(row -> response(row, bookedIds.contains(row.getId()))).toList();
        return new AdminFlightSchedulePageResponse(items, page, size, total, totalPages);
    }

    @Transactional(readOnly = true)
    public AdminFlightScheduleResponse get(long id) {
        FlightSchedule schedule = schedules.findById(id).orElseThrow(AdminFlightScheduleService::notFound);
        return response(schedule, everBooked(id));
    }

    @Transactional
    public AdminFlightScheduleResponse create(AdminCreateFlightScheduleRequest request) {
        if (!request.flightNumber().startsWith(request.airlineCode())) {
            throw new InvalidRequestException("flightNumber", "Số hiệu phải bắt đầu bằng mã hãng đã chọn.");
        }
        Airline airline = airlines.findById(request.airlineCode())
                .orElseThrow(() -> new InvalidRequestException("airlineCode", "Hãng bay này không tồn tại."));
        FlightSearchRules.validateRoute("toCode", request.fromCode(), request.toCode());
        FlightSchedule schedule = FlightSchedule.builder()
                .airline(airline)
                .flightNumber(request.flightNumber())
                .fromAirport(airport(request.fromCode(), "fromCode"))
                .toAirport(airport(request.toCode(), "toCode"))
                .build();
        apply(schedule, LocalTime.parse(request.departTime()), request);
        try {
            schedules.saveAndFlush(schedule);
        } catch (DataIntegrityViolationException error) {
            if (ConstraintViolations.violates(error, "uq_flight_schedules_number")) {
                throw new ConflictException("flightNumber", "Số hiệu này đã được dùng.");
            }
            throw error;
        }
        events.publishEvent(WebCatalogChanged.flights());
        return response(schedule, false);
    }

    @Transactional
    public AdminFlightScheduleResponse update(long id, AdminUpdateFlightScheduleRequest request) {
        FlightSchedule schedule = lock(id);
        boolean booked = everBooked(id);
        LocalTime requestedTime = LocalTime.parse(request.departTime());
        boolean changesTime = !requestedTime.equals(schedule.getDepartTime().truncatedTo(ChronoUnit.MINUTES));
        if (booked && changesTime) {
            throw new ConflictException("departTime", BOOKED_TIMING);
        }
        if (booked && schedule.getDurationMinutes() != request.durationMinutes()) {
            throw new ConflictException("durationMinutes", "Lịch bay từng có đơn nên thời lượng phải giữ nguyên.");
        }
        requireEnoughSeats(schedule, request);
        // Bảo toàn cả giây của dữ liệu cũ khi form gửi lại cùng giờ HH:mm.
        apply(schedule, changesTime ? requestedTime : schedule.getDepartTime(), request);
        events.publishEvent(WebCatalogChanged.flights());
        return response(schedule, booked);
    }

    @Transactional
    public void delete(long id) {
        FlightSchedule schedule = lock(id);
        if (everBooked(id)) {
            throw new ConflictException(BOOKED_DELETE);
        }
        try {
            schedules.delete(schedule);
            schedules.flush();
        } catch (DataIntegrityViolationException error) {
            if (ConstraintViolations.violates(error, "fk_flight_booking_segments_schedule")) {
                throw new ConflictException(BOOKED_DELETE);
            }
            throw error;
        }
        events.publishEvent(WebCatalogChanged.flights());
    }

    private FlightSchedule lock(long id) {
        // Dùng đúng phép khoá của luồng đặt vé, chưa đọc lịch bay vào persistence context.
        return schedules.lockAllByIdIn(List.of(id)).stream().findFirst()
                .orElseThrow(AdminFlightScheduleService::notFound);
    }

    private boolean everBooked(long id) {
        return !schedules.findEverBookedIds(List.of(id)).isEmpty();
    }

    private Airport airport(String code, String field) {
        return airports.findById(code)
                .orElseThrow(() -> new InvalidRequestException(field, "Sân bay này không tồn tại."));
    }

    private AdminFlightScheduleResponse response(FlightSchedule schedule, boolean booked) {
        FlightFareCalculator.Arrival arrival = FlightFareCalculator.arrival(schedule.getDepartTime(),
                schedule.getDurationMinutes());
        return mapper.toAdminSchedule(schedule, arrival.time(), arrival.nextDay(), !booked, !booked);
    }

    private void requireEnoughSeats(FlightSchedule schedule, ScheduleFields fields) {
        var reductions = List.of(
                new Capacity(CabinClass.ECONOMY, fields.economySeats(), "economySeats"),
                new Capacity(CabinClass.PREMIUM_ECONOMY, fields.premiumEconomySeats(), "premiumEconomySeats"),
                new Capacity(CabinClass.BUSINESS, fields.businessSeats(), "businessSeats"),
                new Capacity(CabinClass.FIRST, fields.firstSeats(), "firstSeats"))
                .stream().filter(c -> c.seats() < schedule.seatCapacity(c.cabin())).toList();
        if (reductions.isEmpty()) {
            return;
        }

        var cabins = reductions.stream().map(Capacity::cabin).toList();
        var counts = schedules.countBookedSeatsByDay(schedule.getId(), LocalDate.now(clock), cabins);
        for (Capacity capacity : reductions) {
            long minimum = counts.stream().filter(row -> row.getCabin() == capacity.cabin())
                    .mapToLong(FlightScheduleRepository.DailyBookedSeats::getSeats).max().orElse(0);
            if (capacity.seats() < minimum) {
                throw new ConflictException(capacity.field(), "Có ngày đã bán " + minimum
                        + " ghế ở hạng này. Số ghế tối thiểu là " + minimum + ".");
            }
        }
    }

    private static void apply(FlightSchedule schedule, LocalTime time, ScheduleFields fields) {
        schedule.update(time, fields.durationMinutes(), fields.economyFare(), fields.economySeats(),
                fields.premiumEconomySeats(), fields.businessSeats(), fields.firstSeats());
    }

    private record Capacity(CabinClass cabin, int seats, String field) {
    }

    private static ResourceNotFoundException notFound() {
        return new ResourceNotFoundException("Không tìm thấy lịch bay này.");
    }
}
