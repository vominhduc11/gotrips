package com.gotrips.gotrips_api.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthenticationConverter jwtAuthenticationConverter)
            throws Exception {
        http
            // Dùng bean corsConfigurationSource bên dưới. Phải khai báo trước authorize:
            // request preflight (OPTIONS) không mang token, nếu bị chặn trước sẽ trả 401.
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Chỉ mở health để Docker/monitoring kiểm tra
                .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                // Spec OpenAPI và Swagger UI để Orval sinh client cho web/admin.
                // Tắt hẳn bằng SPRINGDOC_ENABLED=false (khi đó các path này không còn tồn tại).
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                // Đăng ký / đăng nhập là công khai (chưa có token). /auth/me cần token nên không liệt kê ở đây.
                .requestMatchers(HttpMethod.POST, "/auth/register", "/auth/login").permitAll()
                // Dữ liệu công khai cho website. Liệt kê đúng từng đường dẫn, KHÔNG dùng "/tours/**" hay
                // "/hotels/**": các endpoint khác của tour/khách sạn (đặt chỗ, quản trị...) sau này không được
                // vô tình thành công khai. "/tours/*" và "/hotels/*" chỉ khớp MỘT đoạn (chi tiết /tours/{slug},
                // /hotels/{slug}, gồm cả /tours/featured, /hotels/featured), không khớp /hotels/{slug}/gì-đó.
                .requestMatchers(HttpMethod.GET, "/destinations", "/airports", "/tours", "/tours/*", "/hotels",
                        "/hotels/*", "/flight-routes/popular", "/testimonials").permitAll()
                // Tìm chuyến bay: đúng GET /flights và GET /flights/{scheduleId}, KHÔNG dùng "/flights/**".
                .requestMatchers(HttpMethod.GET, "/flights", "/flights/*").permitAll()
                // Đăng ký nhận ưu đãi (form ở Trang chủ, khách chưa đăng nhập).
                .requestMatchers(HttpMethod.POST, "/newsletter/subscriptions").permitAll()
                // Còn lại (gồm /bookings/**) mặc định cần đăng nhập; khi thêm endpoint công khai cho website phải mở rõ
                // ràng ở đây.
                .anyRequest().authenticated())
            // API-only: xác thực bằng JWT ở header "Authorization: Bearer ...". Không có form login/Basic,
            // chưa xác thực thì trả 401 (kèm WWW-Authenticate: Bearer) thay vì redirect.
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter)));
        return http.build();
    }

    /**
     * Băm mật khẩu bằng {@code DelegatingPasswordEncoder}: hiện dùng bcrypt, chuỗi lưu có tiền tố
     * ({@code {bcrypt}...}) nên sau này đổi thuật toán mà không làm hỏng mật khẩu cũ.
     */
    @Bean
    PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
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
