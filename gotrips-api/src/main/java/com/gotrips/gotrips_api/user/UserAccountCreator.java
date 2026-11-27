package com.gotrips.gotrips_api.user;

import java.util.HashSet;
import java.util.Set;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.gotrips.gotrips_api.common.error.ConstraintViolations;
import com.gotrips.gotrips_api.common.error.DuplicateEmailException;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class UserAccountCreator {

    private final UserRepository users;
    private final RoleRepository roles;
    private final PasswordEncoder passwordEncoder;

    /** Tạo tài khoản từ dữ liệu đã chuẩn hoá và kiểm tra, trong transaction của nghiệp vụ gọi. */
    public User create(String fullName, String email, String password, RoleName roleName) {
        if (users.existsByEmail(email)) {
            throw new DuplicateEmailException();
        }
        Role role = roles.findByName(roleName)
                .orElseThrow(() -> new IllegalStateException("Thiếu vai trò trong bảng roles: " + roleName));
        User user = User.builder()
                .email(email)
                .fullName(fullName)
                .passwordHash(passwordEncoder.encode(password))
                .roles(new HashSet<>(Set.of(role)))
                .build();
        try {
            return users.saveAndFlush(user);
        } catch (DataIntegrityViolationException ex) {
            if (ConstraintViolations.violates(ex, "uq_users_email")) {
                throw new DuplicateEmailException();
            }
            throw ex;
        }
    }
}
