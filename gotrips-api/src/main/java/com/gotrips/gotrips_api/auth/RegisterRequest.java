package com.gotrips.gotrips_api.auth;

import static com.gotrips.gotrips_api.auth.RegistrationRules.*;

import com.gotrips.gotrips_api.common.validation.MaxUtf8Bytes;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Yêu cầu đăng ký. Luật mật khẩu khớp {@code registerSchema} ở gotrips-web (server vẫn phải tự kiểm lại).
 * Vai trò không nằm trong request: tài khoản đăng ký công khai luôn là CUSTOMER.
 */
@Schema(description = "Thông tin đăng ký tài khoản khách hàng")
public record RegisterRequest(
        @Schema(example = "Nguyễn Văn An")
        @NotBlank(message = "Vui lòng nhập họ và tên.")
        @Size(min = NAME_MIN, max = NAME_MAX, message = NAME_LENGTH_MESSAGE)
        String fullName,

        @Schema(example = "ban@example.com")
        @NotBlank(message = "Vui lòng nhập địa chỉ email.")
        @Size(max = EMAIL_MAX, message = EMAIL_LENGTH_MESSAGE)
        @Email(message = "Địa chỉ email chưa đúng định dạng.")
        String email,

        @Schema(description = "Tối thiểu 8 ký tự, có cả chữ và số", example = "matkhau123")
        @NotBlank(message = "Vui lòng nhập mật khẩu.")
        @Size(min = PASSWORD_MIN, max = PASSWORD_MAX, message = PASSWORD_LENGTH_MESSAGE)
        @MaxUtf8Bytes(value = PASSWORD_MAX_BYTES, message = PASSWORD_BYTES_MESSAGE)
        @Pattern(regexp = PASSWORD_PATTERN, message = PASSWORD_PATTERN_MESSAGE)
        String password) {

    /** Chuẩn hoá trước khi validate/lưu: bỏ khoảng trắng thừa, email chữ thường. Mật khẩu giữ nguyên. */
    public RegisterRequest {
        fullName = normalizeName(fullName);
        email = normalizeEmail(email);
    }
}
