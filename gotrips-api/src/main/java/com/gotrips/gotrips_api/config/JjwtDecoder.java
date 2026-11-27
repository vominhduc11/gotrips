package com.gotrips.gotrips_api.config;

import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Map;

import javax.crypto.SecretKey;

import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;

/**
 * Kiểm access token bằng jjwt rồi trả về {@link Jwt} của Spring Security, nhờ vậy bộ lọc Bearer của Resource Server,
 * phân quyền theo claim {@code roles} và {@code @AuthenticationPrincipal Jwt} không phải tự viết lại.
 */
class JjwtDecoder implements JwtDecoder {

    /** Độ lệch đồng hồ cho phép khi kiểm exp/nbf. */
    private static final long CLOCK_SKEW_SECONDS = 60;

    /**
     * Spring đưa thông báo này vào header {@code WWW-Authenticate}: chỉ được dùng ký tự ASCII (RFC 6750), chữ có dấu
     * sẽ làm request thành lỗi 500. Cũng không đưa lý do chi tiết của jjwt ra ngoài.
     */
    private static final String INVALID_TOKEN = "Invalid access token";

    private final JwtParser parser;

    JjwtDecoder(SecretKey key, String issuer) {
        this.parser = Jwts.parser()
                // Chỉ nhận HS256: mặc định jjwt chấp nhận cả HS384/HS512 nếu khoá đủ dài
                .sig().clear().add(Jwts.SIG.HS256).and()
                .verifyWith(key)
                // Không nhận token do hệ thống khác cấp
                .requireIssuer(issuer)
                .clockSkewSeconds(CLOCK_SKEW_SECONDS)
                .build();
    }

    /**
     * Mọi token hỏng phải ném {@link BadJwtException}: Spring Security chỉ đổi loại này thành 401, ngoại lệ khác
     * sẽ thành 500.
     */
    @Override
    public Jwt decode(String token) {
        try {
            // parseSignedClaims từ chối token không ký (alg: none)
            Jws<Claims> jws = parser.parseSignedClaims(token);
            // jjwt coi exp là tuỳ chọn, mà token không có hạn thì dùng được mãi
            if (jws.getPayload().getExpiration() == null) {
                throw new BadJwtException(INVALID_TOKEN);
            }
            return toSpringJwt(token, jws);
        } catch (JwtException | IllegalArgumentException e) {
            throw new BadJwtException(INVALID_TOKEN, e);
        }
    }

    private static Jwt toSpringJwt(String token, Jws<Claims> jws) {
        Claims claims = jws.getPayload();
        Map<String, Object> payload = new LinkedHashMap<>(claims);
        // Jwt của Spring đòi các mốc thời gian là Instant, còn jjwt dùng Date
        putAsInstant(payload, Claims.EXPIRATION, claims.getExpiration());
        putAsInstant(payload, Claims.ISSUED_AT, claims.getIssuedAt());
        putAsInstant(payload, Claims.NOT_BEFORE, claims.getNotBefore());

        return Jwt.withTokenValue(token)
                .headers(headers -> headers.putAll(jws.getHeader()))
                .claims(all -> all.putAll(payload))
                .build();
    }

    private static void putAsInstant(Map<String, Object> payload, String name, Date value) {
        if (value != null) {
            payload.put(name, value.toInstant());
        }
    }
}
