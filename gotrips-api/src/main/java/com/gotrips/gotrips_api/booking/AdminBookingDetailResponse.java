package com.gotrips.gotrips_api.booking;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonInclude;

import io.swagger.v3.oas.annotations.media.Schema;

public record AdminBookingDetailResponse(
        @Schema(requiredMode = REQUIRED) String code,
        @Schema(requiredMode = REQUIRED) BookingKind kind,
        @Schema(requiredMode = REQUIRED) BookingStatus status,
        @Schema(requiredMode = REQUIRED) PaymentStatus paymentStatus,
        @Schema(requiredMode = REQUIRED) long totalAmount,
        @Schema(requiredMode = REQUIRED) long receivedAmount,
        @Schema(requiredMode = REQUIRED) Instant createdAt,
        @Schema(requiredMode = REQUIRED) BookingContactResponse contact,
        @Schema(requiredMode = REQUIRED) List<BookingTransitions.Action> availableActions,
        @Schema(requiredMode = REQUIRED) Customer customer,
        @Schema(requiredMode = REQUIRED, nullable = true) String note,
        @Schema(requiredMode = REQUIRED, nullable = true) Instant paidAt,
        @Schema(requiredMode = REQUIRED, nullable = true) Instant confirmedAt,
        @Schema(requiredMode = REQUIRED, nullable = true) Instant cancelledAt,
        @Schema(requiredMode = REQUIRED) BankTransferResponse bankTransfer,
        @JsonInclude(JsonInclude.Include.NON_NULL) TourBookingResponse tour,
        @JsonInclude(JsonInclude.Include.NON_NULL) HotelBookingResponse hotel,
        @JsonInclude(JsonInclude.Include.NON_NULL) FlightBookingResponse flight) {

    public record Customer(
            @Schema(requiredMode = REQUIRED) UUID id,
            @Schema(requiredMode = REQUIRED) String fullName,
            @Schema(requiredMode = REQUIRED) String email,
            @Schema(requiredMode = REQUIRED) boolean hasCustomerProfile) {
    }
}
