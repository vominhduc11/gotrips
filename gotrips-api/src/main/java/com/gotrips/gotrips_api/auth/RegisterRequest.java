package com.gotrips.gotrips_api.auth;

import java.util.Locale;

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
        @Size(min = 2, max = 100, message = "Họ và tên cần từ 2 đến 100 ký tự.")
        String fullName,

        @Schema(example = "ban@example.com")
        @NotBlank(message = "Vui lòng nhập địa chỉ email.")
        @Size(max = 254, message = "Email không được quá 254 ký tự.")
        @Email(message = "Địa chỉ email chưa đúng định dạng.")
        String email,

        @Schema(description = "Tối thiểu 8 ký tự, có cả chữ và số", example = "matkhau123")
        @NotBlank(message = "Vui lòng nhập mật khẩu.")
        @Size(min = 8, max = 72, message = "Mật khẩu cần từ 8 đến 72 ký tự.")
        @MaxUtf8Bytes(value = 72, message = "Mật khẩu quá dài (tối đa 72 byte; ký tự có dấu chiếm nhiều byte hơn).")
        @Pattern(regexp = "(?s)(?=.*\\p{L})(?=.*\\d).*", message = "Mật khẩu cần có cả chữ cái và chữ số.")
        String password) {

    /** Chuẩn hoá trước khi validate/lưu: bỏ khoảng trắng thừa, email chữ thường. Mật khẩu giữ nguyên. */
    public RegisterRequest {
        fullName = fullName == null ? null : fullName.strip();
        email = email == null ? null : email.strip().toLowerCase(Locale.ROOT);
    }
}
