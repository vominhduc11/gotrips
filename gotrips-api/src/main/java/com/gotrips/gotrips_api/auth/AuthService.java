package com.gotrips.gotrips_api.auth;

import java.util.Set;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gotrips.gotrips_api.common.error.DuplicateEmailException;
import com.gotrips.gotrips_api.common.error.UnauthorizedException;
import com.gotrips.gotrips_api.user.Role;
import com.gotrips.gotrips_api.user.RoleName;
import com.gotrips.gotrips_api.user.RoleRepository;
import com.gotrips.gotrips_api.user.User;
import com.gotrips.gotrips_api.user.UserMapper;
import com.gotrips.gotrips_api.user.UserRepository;
import com.gotrips.gotrips_api.user.UserResponse;

@Service
public class AuthService {

    /** Dùng chung cho "sai email" và "sai mật khẩu" để không lộ email nào đã đăng ký. */
    static final String INVALID_CREDENTIALS = "Email hoặc mật khẩu không đúng.";

    private final UserRepository users;
    private final RoleRepository roles;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final UserMapper userMapper;
    /**
     * Chuỗi băm giả để vẫn chạy một lần so khớp khi email không tồn tại: nếu bỏ qua, request "email không có"
     * trả về nhanh hơn hẳn request "email có, sai mật khẩu" và kẻ tấn công dò được email nào đã đăng ký.
     */
    private final String dummyPasswordHash;

    public AuthService(UserRepository users, RoleRepository roles, PasswordEncoder passwordEncoder,
            JwtService jwtService, UserMapper userMapper) {
        this.users = users;
        this.roles = roles;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.userMapper = userMapper;
        this.dummyPasswordHash = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    @Transactional
    public UserResponse register(RegisterRequest request) {
        // Kiểm trước để trả lỗi rõ ràng trong trường hợp thường gặp; ràng buộc UNIQUE của DB bên dưới
        // mới là chốt chặn thật khi hai request cùng email đến đồng thời.
        if (users.existsByEmail(request.email())) {
            throw new DuplicateEmailException();
        }
        Role customer = roles.findByName(RoleName.CUSTOMER)
                .orElseThrow(() -> new IllegalStateException("Thiếu vai trò CUSTOMER trong bảng roles (migration V1)."));

        User user = User.builder()
                .email(request.email())
                .fullName(request.fullName())
                .passwordHash(passwordEncoder.encode(request.password()))
                .roles(Set.of(customer))
                .build();
        try {
            // flush ngay để vi phạm UNIQUE nổ ở đây (và được dịch thành lỗi 409) thay vì lúc commit
            users.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            throw new DuplicateEmailException();
        }
        return userMapper.toResponse(user);
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        User user = users.findByEmail(request.email()).orElse(null);

        String hash = user != null ? user.getPasswordHash() : dummyPasswordHash;
        boolean passwordMatches = passwordEncoder.matches(request.password(), hash);
        if (user == null || !passwordMatches) {
            throw new UnauthorizedException(INVALID_CREDENTIALS);
        }

        JwtService.IssuedToken token = jwtService.issue(user);
        return new LoginResponse(token.value(), "Bearer", token.expiresInSeconds(), userMapper.toResponse(user));
    }

    /** Người dùng của token hiện tại. Tài khoản đã bị xoá sau khi cấp token thì coi như phiên hết hiệu lực. */
    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(UUID userId) {
        return users.findWithRolesById(userId)
                .map(userMapper::toResponse)
                .orElseThrow(() -> new UnauthorizedException("Phiên đăng nhập không còn hợp lệ."));
    }
}
