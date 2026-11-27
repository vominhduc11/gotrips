package com.gotrips.gotrips_api.auth;

import static com.gotrips.gotrips_api.auth.RegistrationRules.*;
import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import com.gotrips.gotrips_api.common.validation.MaxUtf8Bytes;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AdminChangePasswordRequest(
        @Schema(requiredMode = REQUIRED)
        @NotBlank(message = "Vui lòng nhập mật khẩu hiện tại.")
        @MaxUtf8Bytes(value = PASSWORD_MAX_BYTES, message = "Mật khẩu hiện tại không đúng.")
        String currentPassword,

        @Schema(requiredMode = REQUIRED, description = "Từ 8 đến 72 ký tự, có chữ và số, tối đa 72 byte UTF-8")
        @NotBlank(message = "Vui lòng nhập mật khẩu mới.")
        @Size(min = PASSWORD_MIN, max = PASSWORD_MAX, message = PASSWORD_LENGTH_MESSAGE)
        @MaxUtf8Bytes(value = PASSWORD_MAX_BYTES, message = PASSWORD_BYTES_MESSAGE)
        @Pattern(regexp = PASSWORD_PATTERN, message = PASSWORD_PATTERN_MESSAGE)
        String newPassword) {

    @Override
    public String toString() {
        // Không để mật khẩu hiện tại hoặc mật khẩu mới xuất hiện trong log debug.
        return "AdminChangePasswordRequest";
    }
}
