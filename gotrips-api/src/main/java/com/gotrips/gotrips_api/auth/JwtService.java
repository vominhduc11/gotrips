package com.gotrips.gotrips_api.auth;

import java.time.Instant;
import java.util.List;

import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import com.gotrips.gotrips_api.config.JwtProperties;
import com.gotrips.gotrips_api.user.User;

import lombok.RequiredArgsConstructor;

/** Cấp access token (JWT). Việc kiểm token do Spring Security Resource Server làm (xem JwtConfig). */
@Service
@RequiredArgsConstructor
public class JwtService {

    private final JwtEncoder encoder;
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
        Instant now = Instant.now();
        List<String> roles = user.getRoles().stream().map(role -> role.getName().name()).sorted().toList();

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(properties.issuer())
                .issuedAt(now)
                .expiresAt(now.plus(properties.expiration()))
                .subject(user.getId().toString())
                .claim("roles", roles)
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();

        String token = encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return new IssuedToken(token, properties.expiration().toSeconds());
    }
}
