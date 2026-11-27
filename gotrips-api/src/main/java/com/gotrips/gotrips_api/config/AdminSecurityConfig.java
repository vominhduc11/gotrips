package com.gotrips.gotrips_api.config;

import static org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher.withDefaults;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.ObjectPostProcessor;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationEntryPoint;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.util.matcher.AndRequestMatcher;
import org.springframework.security.web.util.matcher.OrRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.util.WebUtils;

import com.gotrips.gotrips_api.user.RoleName;
import com.gotrips.gotrips_api.user.UserMapper;
import com.gotrips.gotrips_api.user.UserRepository;
import com.gotrips.gotrips_api.user.UserResponse;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;

@Configuration
public class AdminSecurityConfig {

    public static final String SESSION_COOKIE = "gotrips_admin_session";

    @Bean
    CookieCsrfTokenRepository adminCsrfTokens(@Value("${gotrips.admin.cookie-secure}") boolean secure) {
        CookieCsrfTokenRepository tokens = CookieCsrfTokenRepository.withHttpOnlyFalse();
        tokens.setCookieCustomizer(cookie -> cookie.path("/").sameSite("Strict").secure(secure));
        return tokens;
    }

    @Bean
    @Order(1)
    SecurityFilterChain adminSecurityFilterChain(HttpSecurity http, UserRepository users, UserMapper mapper,
            CookieCsrfTokenRepository adminCsrfTokens) throws Exception {
        var paths = withDefaults();
        RequestMatcher login = paths.matcher(HttpMethod.POST, "/admin/auth/login");
        RequestMatcher logout = paths.matcher(HttpMethod.POST, "/admin/auth/logout");
        RequestMatcher credentials = new OrRequestMatcher(login, logout);
        var bearer = new DefaultBearerTokenResolver();

        http.securityMatcher(paths.matcher("/admin/**"))
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf.spa().csrfTokenRepository(adminCsrfTokens)
                .withObjectPostProcessor(adminCsrfRules(credentials, bearer)))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .logout(AbstractHttpConfigurer::disable)
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint(new BearerTokenAuthenticationEntryPoint())
                // sendError chuyển qua /error ngoài chain admin và có thể biến 403 thành 401 trên Tomcat.
                .accessDeniedHandler((request, response, denied) -> response.setStatus(HttpServletResponse.SC_FORBIDDEN)))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(login, logout).permitAll()
                .requestMatchers("/admin/staff/**").hasRole(RoleName.ADMIN.name())
                .anyRequest().hasAnyRole(RoleName.STAFF.name(), RoleName.ADMIN.name()))
            .oauth2ResourceServer(oauth -> oauth
                .bearerTokenResolver(request -> {
                    // Cookie cũ có thể đã hết hạn nhưng vẫn phải đăng nhập lại hoặc xoá được.
                    if (credentials.matches(request)) {
                        return null;
                    }
                    String token = bearer.resolve(request);
                    Cookie cookie = WebUtils.getCookie(request, SESSION_COOKIE);
                    return token != null ? token : cookie != null ? cookie.getValue() : null;
                })
                .jwt(jwt -> jwt.jwtAuthenticationConverter(token -> authenticate(token, users, mapper))));
        return http.build();
    }

    private static ObjectPostProcessor<CsrfFilter> adminCsrfRules(RequestMatcher credentials,
            DefaultBearerTokenResolver bearer) {
        RequestMatcher writesWithCookie = request -> {
            if (credentials.matches(request)) {
                return true;
            }
            try {
                // Để bộ xác thực trả 401 khi request ghi không mang thông tin xác thực.
                return WebUtils.getCookie(request, SESSION_COOKIE) != null && bearer.resolve(request) == null;
            } catch (OAuth2AuthenticationException ex) {
                // Header Bearer sai định dạng sẽ bị bộ xác thực từ chối.
                return false;
            }
        };
        return new ObjectPostProcessor<>() {
            @Override
            public <T extends CsrfFilter> T postProcess(T filter) {
                // Resource Server mặc định miễn CSRF cho mọi token do resolver tìm thấy, kể cả từ cookie.
                // Đặt matcher trên filter sau khi DSL đã gắn quy tắc mặc định đó.
                filter.setRequireCsrfProtectionMatcher(
                        new AndRequestMatcher(CsrfFilter.DEFAULT_CSRF_MATCHER, writesWithCookie));
                return filter;
            }
        };
    }

    private static AdminAuthentication authenticate(Jwt jwt, UserRepository users, UserMapper mapper) {
        UUID userId;
        try {
            userId = UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException | NullPointerException ex) {
            throw new InvalidBearerTokenException("Invalid access token");
        }
        UserResponse user = users.findWithRolesById(userId).map(mapper::toResponse)
                .orElseThrow(() -> new InvalidBearerTokenException("Invalid access token"));
        return new AdminAuthentication(jwt, user);
    }

    /** Giữ kết quả tra DB trên request để /me dùng cùng dữ liệu với bước phân quyền. */
    public static final class AdminAuthentication extends JwtAuthenticationToken {

        private final UserResponse user;

        AdminAuthentication(Jwt jwt, UserResponse user) {
            super(jwt, user.roles().stream().map(role -> new SimpleGrantedAuthority("ROLE_" + role.name())).toList());
            this.user = user;
        }

        public UserResponse user() {
            return user;
        }
    }
}
