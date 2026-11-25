package com.gotrips.gotrips_api.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Cấu hình JWT ({@code gotrips.jwt.*}). {@code secret} KHÔNG có giá trị mặc định có chủ đích: một khoá mặc định
 * bị lộ trong mã nguồn sẽ cho phép ai cũng giả mạo được token (kể cả vai trò ADMIN). Thiếu khoá thì API không khởi động.
 */
@Validated
@ConfigurationProperties(prefix = "gotrips.jwt")
public record JwtProperties(
        @NotBlank(message = "Chưa cấu hình GOTRIPS_JWT_SECRET (khoá ký JWT, tối thiểu 32 ký tự). "
                + "Tạo bằng: openssl rand -base64 48")
        String secret,
        @NotNull Duration expiration,
        @NotBlank String issuer) {

    /** Không in khoá ký ra log/ngoại lệ. */
    @Override
    public String toString() {
        return "JwtProperties[issuer=" + issuer + ", expiration=" + expiration + ", secret=***]";
    }
}
