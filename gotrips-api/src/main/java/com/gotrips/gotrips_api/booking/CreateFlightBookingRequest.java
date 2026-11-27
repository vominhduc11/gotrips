package com.gotrips.gotrips_api.booking;

import java.time.LocalDate;
import java.util.List;

import com.gotrips.gotrips_api.flight.CabinClass;
import com.gotrips.gotrips_api.flight.FlightSearchRules;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * Đặt vé máy bay: một chiều (chỉ chiều đi) hoặc khứ hồi (thêm {@code returnScheduleId} + {@code returnDate}). KHÔNG có
 * trường giá: API tự tính từ lịch bay và chốt vào đơn.
 */
@Schema(description = "Yêu cầu đặt vé máy bay")
public record CreateFlightBookingRequest(
        @NotNull(message = "Vui lòng chọn chuyến bay.")
        @Positive(message = "Vui lòng chọn chuyến bay.")
        Long outboundScheduleId,

        @Schema(description = "Chiều về (to → from); bỏ trống nếu một chiều", nullable = true)
        @Positive(message = "Vui lòng chọn chuyến bay.")
        Long returnScheduleId,

        @Schema(example = "SGN")
        @NotBlank(message = "Vui lòng chọn điểm đi.")
        @Pattern(regexp = "|[A-Z]{3}", message = "Vui lòng chọn điểm đi.")
        String from,

        @Schema(example = "HAN")
        @NotBlank(message = "Vui lòng chọn điểm đến.")
        @Pattern(regexp = "|[A-Z]{3}", message = "Vui lòng chọn điểm đến.")
        String to,

        @NotNull(message = "Vui lòng chọn ngày đi.") LocalDate departDate,

        @Schema(description = "Bắt buộc khi khứ hồi", nullable = true) LocalDate returnDate,

        @NotNull(message = "Vui lòng chọn hạng ghế.") CabinClass cabin,

        @NotNull(message = "Vui lòng nhập thông tin người liên hệ.") @Valid ContactRequest contact,

        @NotEmpty(message = FlightSearchRules.NO_ADULT_MESSAGE)
        @Size(max = FlightSearchRules.MAX_PASSENGERS, message = FlightSearchRules.TOO_MANY_PASSENGERS_MESSAGE)
        List<@NotNull(message = "Danh sách hành khách không hợp lệ.") @Valid PassengerRequest> passengers,

        @Schema(nullable = true)
        @Size(max = BookingValidation.NOTE_MAX_LENGTH, message = BookingValidation.NOTE_MAX_MESSAGE)
        String note) {

    public CreateFlightBookingRequest {
        note = BookingValidation.stripToNull(note);
    }
}
