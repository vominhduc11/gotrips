package com.gotrips.gotrips_api.booking;

import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Một hành khách bay. Trẻ em và em bé bắt buộc có ngày sinh (xem {@link PassengerRules}). */
@Schema(description = "Hành khách bay")
public record PassengerRequest(
        @NotNull(message = "Vui lòng chọn loại hành khách.") PassengerType type,

        @NotBlank(message = "Vui lòng nhập họ tên hành khách (như trên giấy tờ tuỳ thân).")
        @Pattern(regexp = BookingValidation.NAME_MIN_LENGTH, message = BookingValidation.NAME_MIN_MESSAGE)
        @Size(max = BookingValidation.NAME_MAX_LENGTH, message = BookingValidation.NAME_MAX_MESSAGE)
        String fullName,

        @Schema(description = "YYYY-MM-DD; người lớn được bỏ trống", nullable = true) LocalDate dateOfBirth) {

    public PassengerRequest {
        fullName = BookingValidation.strip(fullName);
    }
}
