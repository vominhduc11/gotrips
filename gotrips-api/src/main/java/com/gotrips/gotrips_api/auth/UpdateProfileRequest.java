package com.gotrips.gotrips_api.auth;

import static com.gotrips.gotrips_api.auth.RegistrationRules.*;
import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.NOT_REQUIRED;
import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import com.gotrips.gotrips_api.common.validation.PhoneRules;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @Schema(requiredMode = REQUIRED, example = "Nguyễn Văn An")
        @NotBlank(message = "Vui lòng nhập họ và tên.")
        @Size(min = NAME_MIN, max = NAME_MAX, message = NAME_LENGTH_MESSAGE)
        String fullName,

        @Schema(requiredMode = NOT_REQUIRED, nullable = true, example = "0901 234 567",
                description = "Số điện thoại di động. Bỏ trường, gửi null hoặc để trống sẽ xoá số đã lưu.")
        @Size(max = PhoneRules.MAX_LENGTH, message = PhoneRules.LENGTH_MESSAGE)
        @Pattern(regexp = PhoneRules.VIETNAM_PHONE, message = PhoneRules.FORMAT_MESSAGE)
        String phone) {

    public UpdateProfileRequest {
        fullName = normalizeName(fullName);
        phone = phone == null || phone.isBlank() ? null : phone.strip();
    }

    @Override
    public String toString() {
        return "UpdateProfileRequest";
    }
}
