package com.gotrips.gotrips_api.auth;

import java.util.UUID;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gotrips.gotrips_api.common.error.InvalidRequestException;
import com.gotrips.gotrips_api.common.error.UnauthorizedException;
import com.gotrips.gotrips_api.user.RoleName;
import com.gotrips.gotrips_api.user.User;
import com.gotrips.gotrips_api.user.UserAccountCreator;
import com.gotrips.gotrips_api.user.UserMapper;
import com.gotrips.gotrips_api.user.UserRepository;
import com.gotrips.gotrips_api.user.UserResponse;

@Service
public class AuthService {

    /** Dùng chung cho "sai email" và "sai mật khẩu" để không lộ email nào đã đăng ký. */
    static final String INVALID_CREDENTIALS = "Email hoặc mật khẩu không đúng.";

    private final UserRepository users;
    private final UserAccountCreator accounts;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final UserMapper userMapper;
    /**
     * Chuỗi băm giả để vẫn chạy một lần so khớp khi email không tồn tại: nếu bỏ qua, request "email không có"
     * trả về nhanh hơn hẳn request "email có, sai mật khẩu" và kẻ tấn công dò được email nào đã đăng ký.
     */
    private final String dummyPasswordHash;

    public AuthService(UserRepository users, UserAccountCreator accounts, PasswordEncoder passwordEncoder,
            JwtService jwtService, UserMapper userMapper) {
        this.users = users;
        this.accounts = accounts;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.userMapper = userMapper;
        this.dummyPasswordHash = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    @Transactional
    public UserResponse register(RegisterRequest request) {
        return userMapper.toResponse(accounts.create(request.fullName(), request.email(), request.password(),
                RoleName.CUSTOMER));
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        User user = authenticate(request);
        JwtService.IssuedToken token = jwtService.issue(user);
        return new LoginResponse(token.value(), "Bearer", token.expiresInSeconds(), userMapper.toResponse(user));
    }

    @Transactional(readOnly = true)
    public AdminLogin loginAdmin(LoginRequest request) {
        User user = authenticate(request);
        UserResponse response = userMapper.toResponse(user);
        if (!response.roles().contains(RoleName.STAFF) && !response.roles().contains(RoleName.ADMIN)) {
            throw new AccessDeniedException("Tài khoản không có quyền truy cập trang quản trị");
        }
        return new AdminLogin(response, jwtService.issueAdmin(user));
    }

    @Transactional
    public void changeAdminPassword(UUID userId, AdminChangePasswordRequest request) {
        // Hai yêu cầu đổi mật khẩu đồng thời phải kiểm lại mật khẩu trên bản ghi sau khi có khoá.
        User user = users.lockById(userId)
                .orElseThrow(() -> new UnauthorizedException("Phiên đăng nhập không còn hợp lệ."));
        if (!user.hasStaffAccess()) {
            throw new AccessDeniedException("Tài khoản không còn quyền truy cập trang quản trị.");
        }
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new InvalidRequestException("currentPassword", "Mật khẩu hiện tại không đúng.");
        }
        user.changePasswordHash(passwordEncoder.encode(request.newPassword()));
    }

    record AdminLogin(UserResponse user, JwtService.IssuedToken token) {
    }

    private User authenticate(LoginRequest request) {
        User user = users.findByEmail(request.email()).orElse(null);
        String hash = user != null ? user.getPasswordHash() : dummyPasswordHash;
        boolean passwordMatches = passwordEncoder.matches(request.password(), hash);
        if (user == null || !passwordMatches) {
            throw new UnauthorizedException(INVALID_CREDENTIALS);
        }

        return user;
    }

    /** Người dùng của token hiện tại. Tài khoản đã bị xoá sau khi cấp token thì coi như phiên hết hiệu lực. */
    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(UUID userId) {
        return users.findWithRolesById(userId)
                .map(userMapper::toResponse)
                .orElseThrow(() -> new UnauthorizedException("Phiên đăng nhập không còn hợp lệ."));
    }
}
