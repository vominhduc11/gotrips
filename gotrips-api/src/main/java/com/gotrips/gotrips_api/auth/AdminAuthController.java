package com.gotrips.gotrips_api.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.gotrips.gotrips_api.config.AdminSecurityConfig;
import com.gotrips.gotrips_api.config.AdminSecurityConfig.AdminAuthentication;
import com.gotrips.gotrips_api.config.OpenApiConfig;
import com.gotrips.gotrips_api.user.UserResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/admin/auth")
@Tag(name = "Quản trị xác thực")
public class AdminAuthController {

    private final AuthService authService;
    private final CookieCsrfTokenRepository csrfTokens;
    private final boolean secure;

    public AdminAuthController(AuthService authService, CookieCsrfTokenRepository csrfTokens,
            @Value("${gotrips.admin.cookie-secure}") boolean secure) {
        this.authService = authService;
        this.csrfTokens = csrfTokens;
        this.secure = secure;
    }

    @Operation(operationId = "adminLogin", summary = "Đăng nhập trang quản trị",
            description = "Gọi GET /admin/auth/me để nhận XSRF-TOKEN rồi gửi X-XSRF-TOKEN. "
                    + "Lỗi: 400 dữ liệu sai, 401 sai thông tin, 403 thiếu quyền hoặc CSRF không hợp lệ.")
    @PostMapping("/login")
    public UserResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest,
            HttpServletResponse response) {
        var login = authService.loginAdmin(request);
        response.addHeader(HttpHeaders.SET_COOKIE, sessionCookie(login.token().value(), login.token().expiresInSeconds()));
        // Đây là đăng nhập qua controller, nên thay token CSRF ngay khi tạo phiên mới.
        csrfTokens.saveToken(csrfTokens.generateToken(servletRequest), servletRequest, response);
        return login.user();
    }

    @Operation(operationId = "adminLogout", summary = "Đăng xuất trang quản trị",
            description = "Gửi X-XSRF-TOKEN. Lỗi: 403 nếu CSRF không hợp lệ.")
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, sessionCookie("", 0));
        csrfTokens.saveToken(null, request, response);
    }

    @Operation(operationId = "getAdminMe", summary = "Thông tin tài khoản quản trị",
            description = "Lỗi: 401 chưa đăng nhập hoặc phiên hết hạn, 403 tài khoản không còn quyền quản trị.",
            security = {
                @SecurityRequirement(name = OpenApiConfig.ADMIN_COOKIE_SCHEME),
                @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
            })
    @GetMapping("/me")
    public UserResponse me(AdminAuthentication authentication) {
        return authentication.user();
    }

    @Operation(operationId = "changeAdminPassword", summary = "Đổi mật khẩu tài khoản quản trị",
            description = "Lỗi: 400 mật khẩu hiện tại sai hoặc mật khẩu mới không hợp lệ, "
                    + "401 chưa đăng nhập, 403 thiếu quyền hoặc CSRF. JWT đã cấp vẫn hợp lệ đến khi hết hạn.",
            security = {
                @SecurityRequirement(name = OpenApiConfig.ADMIN_COOKIE_SCHEME),
                @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
            })
    @PutMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(AdminAuthentication authentication, @Valid @RequestBody AdminChangePasswordRequest request) {
        authService.changeAdminPassword(authentication.user().id(), request);
    }

    private String sessionCookie(String value, long maxAge) {
        return ResponseCookie.from(AdminSecurityConfig.SESSION_COOKIE, value)
                .httpOnly(true).secure(secure).sameSite("Strict").path("/").maxAge(maxAge).build().toString();
    }
}
