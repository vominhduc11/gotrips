package com.gotrips.gotrips_api.tour;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class AdminDepartureRulesTests {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 25);

    private static TourDeparture departure(String date, int total, int booked, boolean closed) {
        return TourDeparture.builder().id(1L).tourId(1L).departureDate(LocalDate.parse(date)).price(900)
                .originalPrice(1_000L).totalSeats(total).bookedSeats(booked).salesClosed(closed).build();
    }

    @ParameterizedTest
    @CsvSource({
            // ngày, tổng, đã đặt, đóng bán, trạng thái
            "2026-11-26, 10, 0, false, UPCOMING",
            "2026-11-26, 10, 10, false, SOLD_OUT",
            "2026-11-26, 10, 10, true, CLOSED",
            "2026-11-26, 10, 0, true, CLOSED",
            "2026-11-25, 10, 0, false, PAST",
            "2026-11-24, 10, 10, true, PAST" })
    void statePrefersPastThenClosedThenSoldOut(String date, int total, int booked, boolean closed,
            AdminDepartureState state) {
        assertThat(AdminDepartureRules.view(departure(date, total, booked, closed), false, false, TODAY).state())
                .isEqualTo(state);
    }

    @ParameterizedTest
    @CsvSource({
            // ngày, đã đặt, từng có đơn, tour đã xoá, sửa, đổi ngày, xoá
            "2026-11-26, 0, false, false, true, true, true",
            // Dữ liệu mẫu và chỗ bán ngoài hệ thống: có chỗ đã đặt mà không có đơn.
            "2026-11-26, 3, false, false, true, false, false",
            // Đơn đã huỷ trả hết chỗ nhưng vẫn đọc ngày từ chuyến.
            "2026-11-26, 0, true, false, true, false, false",
            "2026-11-25, 0, false, false, false, false, true",
            "2026-11-24, 0, true, false, false, false, false",
            "2026-11-26, 0, false, true, false, false, false" })
    void flagsFollowDateBookingHistoryAndTourDeletion(String date, int booked, boolean hasBookings,
            boolean tourDeleted, boolean editable, boolean dateEditable, boolean deletable) {
        var view = AdminDepartureRules.view(departure(date, 10, booked, false), hasBookings, tourDeleted, TODAY);

        assertThat(view.editable()).isEqualTo(editable);
        assertThat(view.dateEditable()).isEqualTo(dateEditable);
        assertThat(view.deletable()).isEqualTo(deletable);
    }

    @Test
    void remainingSeatsStayVisibleWhenSalesAreClosedAndDiscountOnlyShowsForARealDiscount() {
        var closed = AdminDepartureRules.view(departure("2027-01-01", 10, 4, true), false, false, TODAY);
        assertThat(closed.remainingSeats()).isEqualTo(6);
        assertThat(closed.discountPercent()).isEqualTo(10);

        var noDiscount = TourDeparture.builder().id(1L).tourId(1L).departureDate(TODAY.plusDays(1)).price(900)
                .originalPrice(null).totalSeats(1).build();
        assertThat(AdminDepartureRules.view(noDiscount, false, false, TODAY).discountPercent()).isNull();
    }
}
