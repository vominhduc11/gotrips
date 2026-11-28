package com.gotrips.gotrips_api.common.validation;

/** Luật số di động Việt Nam dùng chung cho hồ sơ và người liên hệ của đơn. */
public final class PhoneRules {

    public static final int MAX_LENGTH = 30;
    public static final String LENGTH_MESSAGE = "Số điện thoại không được quá 30 ký tự.";
    public static final String FORMAT_MESSAGE = "Số điện thoại chưa đúng, ví dụ: 0901 234 567.";

    // Cho phép rỗng để trường bắt buộc chỉ báo một lỗi từ @NotBlank.
    public static final String VIETNAM_PHONE = "|(?:\\+84|0)[35789](?:[ .]?\\d){8}";

    private PhoneRules() {
    }
}
