package com.gotrips.gotrips_api.config;

import java.nio.charset.StandardCharsets;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;

import com.nimbusds.jose.jwk.source.ImmutableSecret;

/**
 * JWT ký đối xứng HS256 bằng Nimbus (có sẵn trong spring-security-oauth2-jose, không dùng jjwt).
 * Cùng một API vừa cấp token ({@link JwtEncoder}) vừa kiểm token ({@link JwtDecoder}) nên khoá đối xứng là đủ.
 */
@Configuration
@EnableConfigurationProperties(JwtProperties.class)
public class JwtConfig {

    /** HS256 cần khoá ≥ 256 bit (32 byte). */
    private static final int MIN_SECRET_BYTES = 32;
    private static final String CLAIM_ROLES = "roles";

    @Bean
    JwtEncoder jwtEncoder(JwtProperties properties) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(secretKey(properties)));
    }

    @Bean
    JwtDecoder jwtDecoder(JwtProperties properties) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(secretKey(properties))
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
        // Mặc định đã kiểm hạn (exp/nbf); thêm kiểm issuer để không nhận token do hệ thống khác cấp
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(properties.issuer()));
        return decoder;
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

    private static SecretKey secretKey(JwtProperties properties) {
        byte[] bytes = properties.secret().getBytes(StandardCharsets.UTF_8);
        if (bytes.length < MIN_SECRET_BYTES) {
            // Không đưa giá trị khoá vào thông báo lỗi
            throw new IllegalStateException("GOTRIPS_JWT_SECRET quá ngắn: cần tối thiểu " + MIN_SECRET_BYTES
                    + " byte cho HS256. Tạo bằng: openssl rand -base64 48");
        }
        return new SecretKeySpec(bytes, "HmacSHA256");
    }
}
