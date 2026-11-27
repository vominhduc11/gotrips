package com.gotrips.gotrips_api.auth;

import java.util.Locale;

/** Luật dùng chung cho đăng ký, tạo nhân viên và đổi mật khẩu. */
public final class RegistrationRules {

    public static final int NAME_MIN = 2;
    public static final int NAME_MAX = 100;
    public static final int EMAIL_MAX = 254;
    public static final int PASSWORD_MIN = 8;
    public static final int PASSWORD_MAX = 72;
    public static final int PASSWORD_MAX_BYTES = 72;
    public static final String PASSWORD_PATTERN = "(?s)(?=.*\\p{L})(?=.*\\d).*";
    public static final String NAME_LENGTH_MESSAGE = "Họ và tên cần từ 2 đến 100 ký tự.";
    public static final String EMAIL_LENGTH_MESSAGE = "Email không được quá 254 ký tự.";
    public static final String PASSWORD_LENGTH_MESSAGE = "Mật khẩu cần từ 8 đến 72 ký tự.";
    public static final String PASSWORD_BYTES_MESSAGE =
            "Mật khẩu quá dài (tối đa 72 byte; ký tự có dấu chiếm nhiều byte hơn).";
    public static final String PASSWORD_PATTERN_MESSAGE = "Mật khẩu cần có cả chữ cái và chữ số.";

    private RegistrationRules() {
    }

    public static String normalizeName(String name) {
        return name == null ? null : name.strip();
    }

    public static String normalizeEmail(String email) {
        return email == null ? null : email.strip().toLowerCase(Locale.ROOT);
    }
}
