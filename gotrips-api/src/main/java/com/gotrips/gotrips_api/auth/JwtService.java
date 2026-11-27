package com.gotrips.gotrips_api.auth;

import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.List;

import javax.crypto.SecretKey;

import org.springframework.stereotype.Service;

import com.gotrips.gotrips_api.config.JwtProperties;
import com.gotrips.gotrips_api.user.User;

import io.jsonwebtoken.Jwts;
import lombok.RequiredArgsConstructor;

/** Cấp access token (JWT) bằng jjwt. Việc kiểm token ở {@code config/JjwtDecoder}. */
@Service
@RequiredArgsConstructor
public class JwtService {

    private final SecretKey jwtSigningKey;
    private final JwtProperties properties;

    /** Token đã ký cùng thời hạn (giây) để trả cho client. */
    public record IssuedToken(String value, long expiresInSeconds) {
    }

    /**
     * {@code user.roles} phải đã được nạp (gọi trong transaction hoặc từ truy vấn có EntityGraph).
     * Chỉ đưa vào token những gì cần để phân quyền: sub = id người dùng, roles. Email/tên lấy từ {@code /auth/me}
     * để không bị lỗi thời khi người dùng đổi thông tin.
     */
    public IssuedToken issue(User user) {
        return issue(user, properties.expiration());
    }

    public IssuedToken issueAdmin(User user) {
        return issue(user, properties.adminExpiration());
    }

    private IssuedToken issue(User user, Duration expiration) {
        Instant now = Instant.now();
        List<String> roles = user.getRoles().stream().map(role -> role.getName().name()).sorted().toList();

        String token = Jwts.builder()
                .issuer(properties.issuer())
                .subject(user.getId().toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(expiration)))
                .claim("roles", roles)
                // Ghi rõ thuật toán: để trống thì jjwt tự chọn theo độ dài khoá
                .signWith(jwtSigningKey, Jwts.SIG.HS256)
                .compact();
        return new IssuedToken(token, expiration.toSeconds());
    }
}
