package com.gotrips.gotrips_api.user;

import static com.gotrips.gotrips_api.auth.RegistrationRules.*;
import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import com.gotrips.gotrips_api.common.validation.MaxUtf8Bytes;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AdminCreateStaffRequest(
        @Schema(requiredMode = REQUIRED)
        @NotBlank(message = "Vui lòng nhập họ và tên.")
        @Size(min = NAME_MIN, max = NAME_MAX, message = NAME_LENGTH_MESSAGE)
        String fullName,

        @Schema(requiredMode = REQUIRED)
        @NotBlank(message = "Vui lòng nhập địa chỉ email.")
        @Size(max = EMAIL_MAX, message = EMAIL_LENGTH_MESSAGE)
        @Email(message = "Địa chỉ email chưa đúng định dạng.")
        String email,

        @Schema(requiredMode = REQUIRED, description = "Từ 8 đến 72 ký tự, có chữ và số, tối đa 72 byte UTF-8")
        @NotBlank(message = "Vui lòng nhập mật khẩu.")
        @Size(min = PASSWORD_MIN, max = PASSWORD_MAX, message = PASSWORD_LENGTH_MESSAGE)
        @MaxUtf8Bytes(value = PASSWORD_MAX_BYTES, message = PASSWORD_BYTES_MESSAGE)
        @Pattern(regexp = PASSWORD_PATTERN, message = PASSWORD_PATTERN_MESSAGE)
        String password,

        @Schema(requiredMode = REQUIRED)
        @NotNull(message = "Vui lòng chọn vai trò.")
        AdminStaffRole role) {

    public AdminCreateStaffRequest {
        fullName = normalizeName(fullName);
        email = normalizeEmail(email);
    }

    @Override
    public String toString() {
        // Spring MVC có thể ghi DTO khi bật log debug.
        return "AdminCreateStaffRequest";
    }
}
