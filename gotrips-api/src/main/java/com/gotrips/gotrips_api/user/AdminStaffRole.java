package com.gotrips.gotrips_api.user;

public enum AdminStaffRole {
    STAFF, ADMIN;

    RoleName roleName() {
        return RoleName.valueOf(name());
    }
}
