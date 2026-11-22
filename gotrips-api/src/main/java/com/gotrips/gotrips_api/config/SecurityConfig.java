package com.gotrips.gotrips_api.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Dùng bean corsConfigurationSource bên dưới. Phải khai báo trước authorize:
            // request preflight (OPTIONS) không mang token, nếu bị chặn trước sẽ trả 401.
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Chỉ mở health để Docker/monitoring kiểm tra; mọi thứ khác cần xác thực
                .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                // Spec OpenAPI và Swagger UI để Orval sinh client cho admin.
                // Tắt hẳn bằng SPRINGDOC_ENABLED=false (khi đó các path này không còn tồn tại).
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                .anyRequest().authenticated())
            // API-only: không có form login, chưa xác thực thì trả 401 thay vì redirect
            .httpBasic(Customizer.withDefaults());
        return http.build();
    }

    /**
     * CORS cho admin: SPA chạy trên trình duyệt gọi API khác origin.
     * Website khách gọi từ server Next.js nên không cần CORS.
     * Liệt kê origin cụ thể, không dùng "*": admin gửi credentials, và trình duyệt
     * không chấp nhận "*" khi có credentials.
     */
    @Bean
    CorsConfigurationSource corsConfigurationSource(
            @Value("${gotrips.cors.allowed-origins}") List<String> allowedOrigins) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(allowedOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        // Trình duyệt được cache kết quả preflight 1 giờ, đỡ gửi OPTIONS mỗi request
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
