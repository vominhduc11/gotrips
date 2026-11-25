package com.gotrips.gotrips_api.user;

/**
 * Vai trò trong hệ thống. Giá trị khớp cột {@code roles.name} (được seed ở migration V1).
 * Trong Spring Security được map thành authority {@code ROLE_<tên>} (xem JwtConfig).
 */
public enum RoleName {
    CUSTOMER,
    STAFF,
    ADMIN
}
