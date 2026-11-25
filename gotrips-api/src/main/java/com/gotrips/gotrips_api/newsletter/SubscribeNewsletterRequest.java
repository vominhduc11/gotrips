package com.gotrips.gotrips_api.newsletter;

import java.util.Locale;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Yêu cầu đăng ký nhận ưu đãi. Định dạng email khớp {@code newsletterSchema} ở gotrips-web (server vẫn phải tự
 * kiểm lại); đổi một nơi phải đổi nơi kia. Không dùng {@code @Email}: validator của Hibernate chấp nhận
 * {@code a@b} (không có tên miền cấp cao), trong khi form web đòi có dấu chấm và đuôi từ 2 ký tự.
 */
@Schema(description = "Email đăng ký nhận ưu đãi")
public record SubscribeNewsletterRequest(
        @Schema(example = "ban@example.com")
        @NotBlank(message = "Vui lòng nhập địa chỉ email.")
        @Size(max = 254, message = "Email không được quá 254 ký tự.")
        @Pattern(regexp = "[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}",
                message = "Địa chỉ email chưa đúng định dạng, ví dụ: ban@example.com.")
        String email) {

    /** Chuẩn hoá trước khi validate/lưu: bỏ khoảng trắng thừa, chữ thường (khớp ràng buộc CHECK ở DB). */
    public SubscribeNewsletterRequest {
        email = email == null ? null : email.strip().toLowerCase(Locale.ROOT);
    }
}
