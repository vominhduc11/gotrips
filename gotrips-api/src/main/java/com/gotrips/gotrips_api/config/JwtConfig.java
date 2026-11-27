package com.gotrips.gotrips_api.config;

import java.nio.charset.StandardCharsets;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;

/**
 * JWT ký đối xứng HS256 bằng jjwt. Cùng một API vừa cấp token ({@code JwtService}) vừa kiểm token
 * ({@link JjwtDecoder}) nên khoá đối xứng là đủ. Resource Server của Spring Security chỉ lo đọc header Bearer và
 * phân quyền.
 */
@Configuration
@EnableConfigurationProperties(JwtProperties.class)
public class JwtConfig {

    /** HS256 cần khoá ≥ 256 bit (32 byte). */
    private static final int MIN_SECRET_BYTES = 32;
    private static final String CLAIM_ROLES = "roles";

    /** Khoá dùng chung cho việc ký và kiểm token. Thiếu hoặc quá ngắn thì API không khởi động. */
    @Bean
    SecretKey jwtSigningKey(JwtProperties properties) {
        byte[] bytes = properties.secret().getBytes(StandardCharsets.UTF_8);
        if (bytes.length < MIN_SECRET_BYTES) {
            // Không đưa giá trị khoá vào thông báo lỗi
            throw new IllegalStateException("GOTRIPS_JWT_SECRET quá ngắn: cần tối thiểu " + MIN_SECRET_BYTES
                    + " byte cho HS256. Tạo bằng: openssl rand -base64 48");
        }
        return new SecretKeySpec(bytes, "HmacSHA256");
    }

    @Bean
    JwtDecoder jwtDecoder(SecretKey jwtSigningKey, JwtProperties properties) {
        return new JjwtDecoder(jwtSigningKey, properties.issuer());
    }

    /** Claim {@code roles: ["CUSTOMER"]} → authority {@code ROLE_CUSTOMER} để dùng với {@code hasRole("CUSTOMER")}. */
    @Bean
    JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter authorities = new JwtGrantedAuthoritiesConverter();
        authorities.setAuthoritiesClaimName(CLAIM_ROLES);
        authorities.setAuthorityPrefix("ROLE_");

        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(authorities);
        return converter;
    }
}
