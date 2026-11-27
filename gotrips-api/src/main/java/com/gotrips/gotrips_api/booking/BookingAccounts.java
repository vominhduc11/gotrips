package com.gotrips.gotrips_api.booking;

import java.util.UUID;

import org.springframework.stereotype.Component;

import com.gotrips.gotrips_api.common.error.UnauthorizedException;
import com.gotrips.gotrips_api.user.UserRepository;

import lombok.RequiredArgsConstructor;

/** Chủ đơn phải là tài khoản còn tồn tại: token cấp trước khi tài khoản bị xoá thì coi như phiên hết hiệu lực. */
@Component
@RequiredArgsConstructor
class BookingAccounts {

    private final UserRepository userRepository;

    void requireExisting(UUID userId) {
        if (!userRepository.existsById(userId)) {
            throw new UnauthorizedException("Phiên đăng nhập không còn hợp lệ.");
        }
    }
}
