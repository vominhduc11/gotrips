package com.gotrips.gotrips_api.dashboard;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import com.gotrips.gotrips_api.tour.AdminDepartureState;

import io.swagger.v3.oas.annotations.media.Schema;

public record AdminDashboardResponse(
        @Schema(requiredMode = REQUIRED) LocalDate from,
        @Schema(requiredMode = REQUIRED) LocalDate to,
        @Schema(requiredMode = REQUIRED, description = "Tổng đã thu trong khoảng, trừ đơn đã huỷ, VND")
        BigDecimal revenueCollected,
        @Schema(requiredMode = REQUIRED) long newBookings,
        @Schema(requiredMode = REQUIRED) DashboardBookingKinds newBookingsByKind,
        @Schema(requiredMode = REQUIRED) long awaitingPayment,
        @Schema(requiredMode = REQUIRED) long awaitingConfirmation,
        @Schema(requiredMode = REQUIRED) DashboardRefundPending refundPending,
        @Schema(requiredMode = REQUIRED) DashboardCustomers customers,
        @Schema(requiredMode = REQUIRED) DashboardTours tours,
        @Schema(requiredMode = REQUIRED) List<DashboardDaily> daily,
        @Schema(requiredMode = REQUIRED) List<DashboardDeparture> upcomingDepartures) {

    public record DashboardBookingKinds(
            @Schema(requiredMode = REQUIRED) long tour,
            @Schema(requiredMode = REQUIRED) long hotel,
            @Schema(requiredMode = REQUIRED) long flight) {
    }

    public record DashboardRefundPending(
            @Schema(requiredMode = REQUIRED) long count,
            @Schema(requiredMode = REQUIRED, description = "Tổng cần hoàn, VND") BigDecimal amount) {
    }

    public record DashboardCustomers(
            @Schema(requiredMode = REQUIRED) long total,
            @Schema(requiredMode = REQUIRED) long newCustomers) {
    }

    public record DashboardTours(
            @Schema(requiredMode = REQUIRED) long active,
            @Schema(requiredMode = REQUIRED) long hidden,
            @Schema(requiredMode = REQUIRED) long bookable) {
    }

    public record DashboardDaily(
            @Schema(requiredMode = REQUIRED) LocalDate date,
            @Schema(requiredMode = REQUIRED) long newBookings,
            @Schema(requiredMode = REQUIRED, description = "Tổng đã thu trong ngày, VND") BigDecimal revenueCollected) {
    }

    public record DashboardDeparture(
            @Schema(requiredMode = REQUIRED) long id,
            @Schema(requiredMode = REQUIRED) long tourId,
            @Schema(requiredMode = REQUIRED) String tourTitle,
            @Schema(requiredMode = REQUIRED) LocalDate departureDate,
            @Schema(requiredMode = REQUIRED) int bookedSeats,
            @Schema(requiredMode = REQUIRED) int totalSeats,
            @Schema(requiredMode = REQUIRED) AdminDepartureState state) {
    }
}
