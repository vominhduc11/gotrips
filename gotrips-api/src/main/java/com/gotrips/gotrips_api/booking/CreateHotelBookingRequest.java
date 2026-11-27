package com.gotrips.gotrips_api.booking;

import java.time.LocalDate;

import com.gotrips.gotrips_api.hotel.HotelStayCalculator;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/** Đặt phòng khách sạn. KHÔNG có trường giá: API tự tính từ loại phòng và chốt vào đơn. */
@Schema(description = "Yêu cầu đặt phòng khách sạn")
public record CreateHotelBookingRequest(
        @NotNull(message = "Vui lòng chọn loại phòng.")
        @Positive(message = "Vui lòng chọn loại phòng.")
        Long roomTypeId,

        @NotNull(message = "Vui lòng chọn ngày nhận phòng.") LocalDate checkIn,

        @NotNull(message = "Vui lòng chọn ngày trả phòng.") LocalDate checkOut,

        @NotNull(message = "Số khách phải từ 1 đến 30.")
        @Min(value = 1, message = "Số khách phải từ 1 đến 30.")
        @Max(value = HotelStayCalculator.MAX_GUESTS, message = "Số khách phải từ 1 đến 30.")
        Integer guests,

        @NotNull(message = "Số phòng phải từ 1 đến 10.")
        @Min(value = 1, message = "Số phòng phải từ 1 đến 10.")
        @Max(value = HotelStayCalculator.MAX_ROOMS, message = "Số phòng phải từ 1 đến 10.")
        Integer rooms,

        @NotNull(message = "Vui lòng nhập thông tin người liên hệ.") @Valid ContactRequest contact,

        @Schema(description = "Người nhận phòng")
        @NotBlank(message = "Vui lòng nhập họ tên người nhận phòng.")
        @Pattern(regexp = BookingValidation.NAME_MIN_LENGTH, message = BookingValidation.NAME_MIN_MESSAGE)
        @Size(max = BookingValidation.NAME_MAX_LENGTH, message = BookingValidation.NAME_MAX_MESSAGE)
        String guestName,

        @Schema(nullable = true)
        @Size(max = BookingValidation.NOTE_MAX_LENGTH, message = BookingValidation.NOTE_MAX_MESSAGE)
        String note) {

    public CreateHotelBookingRequest {
        guestName = BookingValidation.strip(guestName);
        note = BookingValidation.stripToNull(note);
    }
}
