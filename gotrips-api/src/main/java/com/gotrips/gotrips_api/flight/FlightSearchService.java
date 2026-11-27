package com.gotrips.gotrips_api.flight;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gotrips.gotrips_api.common.error.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;

/** Tìm chuyến bay theo ngày. Lịch bay chạy mỗi ngày nên ngày nào (không ở quá khứ) cũng có chuyến. */
@Service
@RequiredArgsConstructor
public class FlightSearchService {

    private final FlightScheduleRepository scheduleRepository;
    private final FlightSeatInventory seatInventory;
    private final FlightMapper flightMapper;
    private final Clock clock;

    /** Tham số một lượt tìm. Số hành khách dùng để tính {@code isBookable} của từng chuyến. */
    public record Query(String from, String to, LocalDate date, CabinClass cabin, int adults, int children,
            int infants) {
    }

    /** Các chuyến {@code from → to} trong ngày, sắp theo giờ cất cánh rồi id. Mã sân bay lạ cho kết quả rỗng. */
    @Transactional(readOnly = true)
    public List<FlightOptionResponse> search(Query query) {
        LocalDate today = validate(query);
        List<FlightSchedule> schedules = scheduleRepository.findByRoute(query.from(), query.to());
        Map<Long, Long> booked = seatInventory.bookedSeats(
                schedules.stream().map(FlightSchedule::getId).toList(), query.date(), query.cabin());
        return schedules.stream()
                .map(schedule -> toOption(schedule, query, booked.getOrDefault(schedule.getId(), 0L), today))
                .toList();
    }

    /** Một chuyến theo id lịch bay; id không có hoặc sai chiều thì 404. */
    @Transactional(readOnly = true)
    public FlightOptionResponse detail(long scheduleId, Query query) {
        LocalDate today = validate(query);
        FlightSchedule schedule = scheduleRepository.findByIdAndRoute(scheduleId, query.from(), query.to())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chuyến bay này."));
        long booked = seatInventory.bookedSeats(List.of(scheduleId), query.date(), query.cabin())
                .getOrDefault(scheduleId, 0L);
        return toOption(schedule, query, booked, today);
    }

    private LocalDate validate(Query query) {
        LocalDate today = LocalDate.now(clock);
        FlightSearchRules.validateRoute(query.from(), query.to());
        FlightSearchRules.validateNotPast("date", query.date(), today);
        FlightSearchRules.validatePassengerCounts(query.adults(), query.children(), query.infants(), "adults",
                "infants");
        return today;
    }

    private FlightOptionResponse toOption(FlightSchedule schedule, Query query, long booked, LocalDate today) {
        FlightFareCalculator.Arrival arrival = FlightFareCalculator.arrival(schedule.getDepartTime(),
                schedule.getDurationMinutes());
        int seatsLeft = FlightSeatInventory.seatsLeft(schedule.seatCapacity(query.cabin()), booked);
        // Đặt trực tuyến chỉ từ ngày mai; em bé ngồi cùng người lớn nên không cần ghế riêng.
        boolean bookable = query.date().isAfter(today) && seatsLeft >= query.adults() + query.children();

        return flightMapper.toOption(schedule, query.date(), query.cabin(),
                FlightFareCalculator.fares(schedule.getEconomyFare(), query.cabin()), arrival.time(),
                arrival.nextDay(), seatsLeft, bookable);
    }
}
