package com.gotrips.gotrips_api.booking;

import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Một người đi tour. Ngày sinh không bắt buộc, nhưng không được sau hôm nay (kiểm ở service). */
@Schema(description = "Người đi tour")
public record TravelerRequest(
        @NotBlank(message = "Vui lòng nhập họ tên người đi.")
        @Pattern(regexp = BookingValidation.NAME_MIN_LENGTH, message = BookingValidation.NAME_MIN_MESSAGE)
        @Size(max = BookingValidation.NAME_MAX_LENGTH, message = BookingValidation.NAME_MAX_MESSAGE)
        String fullName,

        @Schema(description = "YYYY-MM-DD, bỏ trống nếu không nhập", nullable = true) LocalDate dateOfBirth) {

    public TravelerRequest {
        fullName = BookingValidation.strip(fullName);
    }
}
