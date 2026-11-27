package com.gotrips.gotrips_api.booking;

import java.time.LocalDate;
import java.util.UUID;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.format.annotation.DateTimeFormat.ISO;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record AdminBookingFilters(
        @Size(max = 254) String q,
        BookingKind kind,
        BookingStatus status,
        PaymentStatus paymentStatus,
        @DateTimeFormat(iso = ISO.DATE) LocalDate createdFrom,
        @DateTimeFormat(iso = ISO.DATE) LocalDate createdTo,
        UUID customerId,
        @Min(1) @Schema(type = "integer", defaultValue = "1") Integer page,
        @Min(1) @Max(100) @Schema(type = "integer", defaultValue = "20") Integer size,
        @Schema(defaultValue = "CREATED_DESC") AdminBookingSort sort) {

    int pageNumber() {
        return page == null ? 1 : page;
    }

    int pageSize() {
        return size == null ? 20 : size;
    }

    AdminBookingSort order() {
        return sort == null ? AdminBookingSort.CREATED_DESC : sort;
    }
}
