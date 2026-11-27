package com.gotrips.gotrips_api.common.security;

import java.util.UUID;

import org.springframework.security.oauth2.jwt.Jwt;

import com.gotrips.gotrips_api.common.error.UnauthorizedException;

/** Đọc id người dùng (claim {@code sub}) từ access token đã được Spring Security kiểm chữ ký và hạn. */
public final class JwtUserId {

    private JwtUserId() {
    }

    public static UUID from(Jwt jwt) {
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException | NullPointerException e) {
            // Token ký đúng nhưng subject không phải id của hệ thống này: coi như không hợp lệ
            throw new UnauthorizedException("Phiên đăng nhập không còn hợp lệ.");
        }
    }
}
