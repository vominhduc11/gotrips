package com.gotrips.gotrips_api.dashboard;

import static com.gotrips.gotrips_api.config.ClockConfig.BUSINESS_ZONE;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.EnumMap;
import java.util.HashMap;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import com.gotrips.gotrips_api.booking.BookingKind;
import com.gotrips.gotrips_api.common.error.InvalidRequestException;
import com.gotrips.gotrips_api.dashboard.AdminDashboardResponse.DashboardBookingKinds;
import com.gotrips.gotrips_api.dashboard.AdminDashboardResponse.DashboardDaily;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AdminDashboardService {

    private final Clock clock;
    private final AdminDashboardQuery query;

    // Các truy vấn phải thấy cùng một ảnh chụp DB, kể cả khi có đơn vừa ghi hoặc vừa đổi trạng thái giữa hai lượt đọc.
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public AdminDashboardResponse get(LocalDate requestedFrom, LocalDate requestedTo) {
        LocalDate today = LocalDate.now(clock.withZone(BUSINESS_ZONE));
        LocalDate to = requestedTo == null ? today : requestedTo;
        validateYear(to, "to");
        LocalDate from = requestedFrom == null ? to.minusDays(29) : requestedFrom;
        validateYear(from, "from");
        long daysBetween = ChronoUnit.DAYS.between(from, to);
        if (daysBetween < 0) {
            throw new InvalidRequestException("to", "Ngày kết thúc phải từ ngày bắt đầu trở đi.");
        }
        if (daysBetween >= 366) {
            throw new InvalidRequestException("to", "Khoảng ngày tối đa là 366 ngày.");
        }

        var start = from.atStartOfDay(BUSINESS_ZONE).toOffsetDateTime();
        var end = to.plusDays(1).atStartOfDay(BUSINESS_ZONE).toOffsetDateTime();
        var bookingDays = new HashMap<LocalDate, Long>();
        var bookingKinds = new EnumMap<BookingKind, Long>(BookingKind.class);
        for (var row : query.bookingDays(start, end)) {
            bookingDays.merge(row.date(), row.count(), Long::sum);
            bookingKinds.merge(row.kind(), row.count(), Long::sum);
        }
        var revenueDays = query.revenueDays(start, end);
        var daily = from.datesUntil(to.plusDays(1))
                .map(date -> new DashboardDaily(date, bookingDays.getOrDefault(date, 0L),
                        revenueDays.getOrDefault(date, BigDecimal.ZERO)))
                .toList();
        var revenue = daily.stream().map(DashboardDaily::revenueCollected).reduce(BigDecimal.ZERO, BigDecimal::add);
        long newBookings = daily.stream().mapToLong(DashboardDaily::newBookings).sum();
        var kinds = new DashboardBookingKinds(bookingKinds.getOrDefault(BookingKind.TOUR, 0L),
                bookingKinds.getOrDefault(BookingKind.HOTEL, 0L), bookingKinds.getOrDefault(BookingKind.FLIGHT, 0L));
        var work = query.bookingWork();

        return new AdminDashboardResponse(from, to, revenue, newBookings, kinds, work.awaitingPayment(),
                work.awaitingConfirmation(), work.refundPending(), query.customers(start, end), query.tours(today),
                daily, query.upcomingDepartures(today));
    }

    private static void validateYear(LocalDate value, String field) {
        if (value.getYear() < 1 || value.getYear() > 9999) {
            throw new InvalidRequestException(field, "Ngày phải theo định dạng YYYY-MM-DD.");
        }
    }
}
