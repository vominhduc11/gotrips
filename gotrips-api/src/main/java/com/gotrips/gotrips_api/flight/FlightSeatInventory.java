package com.gotrips.gotrips_api.flight;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

/** Ghế còn lại của lịch bay trong một ngày. Dùng chung cho tìm chuyến bay và đặt vé để hai nơi đếm cùng một cách. */
@Component
@RequiredArgsConstructor
public class FlightSeatInventory {

    private final FlightScheduleRepository scheduleRepository;

    /** Ghế đã bán theo id lịch bay (lịch bay chưa bán ghế nào thì không có trong map). Một query cho cả danh sách. */
    public Map<Long, Long> bookedSeats(Collection<Long> scheduleIds, LocalDate date, CabinClass cabin) {
        if (scheduleIds.isEmpty()) {
            return Map.of();
        }
        List<FlightScheduleRepository.BookedSeats> rows = scheduleRepository.countBookedSeats(scheduleIds, date, cabin);
        return rows.stream().collect(Collectors.toMap(FlightScheduleRepository.BookedSeats::getScheduleId,
                FlightScheduleRepository.BookedSeats::getSeats));
    }

    /** Còn lại = sức chứa - đã bán, không âm (sức chứa có thể bị giảm sau khi đã bán). */
    public static int seatsLeft(int capacity, long booked) {
        return (int) Math.max(0, capacity - booked);
    }
}
