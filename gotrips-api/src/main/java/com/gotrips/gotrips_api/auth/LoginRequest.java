package com.gotrips.gotrips_api.auth;

import java.util.Locale;

import com.gotrips.gotrips_api.common.validation.MaxUtf8Bytes;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Yêu cầu đăng nhập. Chỉ kiểm tra "có nhập" và giới hạn kích thước, không áp luật độ mạnh mật khẩu
 * (để không lộ chính sách mật khẩu cho người lạ, và vì tài khoản cũ có thể tạo theo luật khác).
 */
@Schema(description = "Thông tin đăng nhập")
public record LoginRequest(
        @Schema(example = "ban@example.com")
        @NotBlank(message = "Vui lòng nhập địa chỉ email.")
        @Size(max = 254, message = "Email không được quá 254 ký tự.")
        String email,

        @NotBlank(message = "Vui lòng nhập mật khẩu.")
        // BCrypt chỉ đọc 72 byte; mật khẩu dài hơn chắc chắn không phải mật khẩu đã đăng ký
        @MaxUtf8Bytes(value = 72, message = "Mật khẩu quá dài.")
        String password) {

    public LoginRequest {
        email = email == null ? null : email.strip().toLowerCase(Locale.ROOT);
    }
}
