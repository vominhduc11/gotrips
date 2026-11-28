package com.gotrips.gotrips_api.booking;

import com.gotrips.gotrips_api.common.validation.PhoneRules;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Người liên hệ của đơn (giống nhau ở tour, khách sạn, vé máy bay). */
@Schema(description = "Người liên hệ")
public record ContactRequest(
        @Schema(example = "Nguyễn Minh Anh")
        @NotBlank(message = "Vui lòng nhập họ tên người liên hệ.")
        @Pattern(regexp = BookingValidation.NAME_MIN_LENGTH, message = BookingValidation.NAME_MIN_MESSAGE)
        @Size(max = BookingValidation.NAME_MAX_LENGTH, message = BookingValidation.NAME_MAX_MESSAGE)
        String fullName,

        @Schema(example = "ban@example.com")
        @NotBlank(message = "Vui lòng nhập địa chỉ email.")
        @Size(max = 254, message = "Email không được quá 254 ký tự.")
        @Pattern(regexp = BookingValidation.EMAIL,
                message = "Địa chỉ email chưa đúng định dạng, ví dụ: ban@example.com.")
        String email,

        @Schema(example = "0901 234 567")
        @NotBlank(message = "Vui lòng nhập số điện thoại.")
        @Size(max = PhoneRules.MAX_LENGTH, message = PhoneRules.LENGTH_MESSAGE)
        @Pattern(regexp = PhoneRules.VIETNAM_PHONE, message = PhoneRules.FORMAT_MESSAGE)
        String phone) {

    public ContactRequest {
        fullName = BookingValidation.strip(fullName);
        email = BookingValidation.strip(email);
        phone = BookingValidation.strip(phone);
    }
}
