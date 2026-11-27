package com.gotrips.gotrips_api.booking;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/** Đặt tour. KHÔNG có trường giá: API tự tính từ chuyến khởi hành và chốt vào đơn. */
@Schema(description = "Yêu cầu đặt tour")
public record CreateTourBookingRequest(
        @NotNull(message = "Vui lòng chọn ngày khởi hành.")
        @Positive(message = "Vui lòng chọn ngày khởi hành.")
        Long departureId,

        @NotNull(message = BookingValidation.TOUR_GUESTS_MESSAGE)
        @Min(value = 1, message = BookingValidation.TOUR_GUESTS_MESSAGE)
        @Max(value = BookingValidation.MAX_TOUR_GUESTS, message = BookingValidation.TOUR_GUESTS_MESSAGE)
        Integer guests,

        @NotNull(message = "Vui lòng nhập thông tin người liên hệ.") @Valid ContactRequest contact,

        @Schema(description = "Đúng bằng số khách")
        @NotNull(message = BookingValidation.TRAVELER_COUNT_MESSAGE)
        @Size(min = 1, max = BookingValidation.MAX_TOUR_GUESTS, message = BookingValidation.TRAVELER_COUNT_MESSAGE)
        List<@NotNull(message = BookingValidation.TRAVELER_COUNT_MESSAGE) @Valid TravelerRequest> travelers,

        @Schema(nullable = true)
        @Size(max = BookingValidation.NOTE_MAX_LENGTH, message = BookingValidation.NOTE_MAX_MESSAGE)
        String note) {

    public CreateTourBookingRequest {
        note = BookingValidation.stripToNull(note);
    }
}
