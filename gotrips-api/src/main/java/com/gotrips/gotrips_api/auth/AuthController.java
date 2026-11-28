package com.gotrips.gotrips_api.auth;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.gotrips.gotrips_api.common.security.JwtUserId;
import com.gotrips.gotrips_api.config.OpenApiConfig;
import com.gotrips.gotrips_api.user.UserResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Đăng ký / đăng nhập / quản lý tài khoản hiện tại.
 * Lỗi trả theo {@code ProblemDetail} (xem GlobalExceptionHandler) và được client (Orval + ApiError) chuyển thành
 * ngoại lệ, nên spec chỉ khai báo kết quả thành công để client sinh ra có kiểu gọn: 400 (dữ liệu sai, kèm
 * {@code errors[]} theo field), 401 (sai thông tin / token không hợp lệ), 409 (email đã đăng ký).
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Tag(name = "Xác thực", description = "Đăng ký, đăng nhập và thông tin người dùng hiện tại")
public class AuthController {

    private final AuthService authService;

    @Operation(operationId = "register", summary = "Đăng ký tài khoản khách hàng",
            description = "Lỗi: 400 dữ liệu không hợp lệ, 409 email đã được đăng ký (kèm errors[] theo field).")
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @Operation(operationId = "login", summary = "Đăng nhập, nhận access token (JWT)",
            description = "Lỗi: 400 dữ liệu không hợp lệ, 401 email hoặc mật khẩu không đúng.")
    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @Operation(operationId = "getMe", summary = "Thông tin người dùng đang đăng nhập",
            description = "Lỗi: 401 thiếu token, token sai/hết hạn hoặc tài khoản không còn tồn tại.",
            security = @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME))
    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal Jwt jwt) {
        return authService.getCurrentUser(JwtUserId.from(jwt));
    }

    @Operation(operationId = "updateMe", summary = "Cập nhật hồ sơ của người dùng đang đăng nhập",
            description = "Thay toàn bộ hồ sơ có thể sửa. Bỏ trường phone, gửi null hoặc để trống sẽ xoá số đã lưu. "
                    + "Lỗi: 400 dữ liệu không hợp lệ (kèm errors[] theo field), "
                    + "401 thiếu token, token không hợp lệ hoặc tài khoản không còn tồn tại.",
            security = @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME))
    @PutMapping("/me")
    public UserResponse updateMe(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody UpdateProfileRequest request) {
        return authService.updateProfile(JwtUserId.from(jwt), request);
    }

    @Operation(operationId = "changeMyPassword", summary = "Đổi mật khẩu của người dùng đang đăng nhập",
            description = "Lỗi: 400 dữ liệu không hợp lệ hoặc sai mật khẩu hiện tại (kèm errors[] theo field), "
                    + "401 thiếu token, token không hợp lệ hoặc tài khoản không còn tồn tại.",
            security = @SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME))
    @PutMapping("/me/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changeMyPassword(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ChangePasswordRequest request) {
        authService.changeMyPassword(JwtUserId.from(jwt), request);
    }
}
