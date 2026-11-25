package com.gotrips.gotrips_api.common.error;

/** Đăng ký với email đã có tài khoản → HTTP 409, lỗi gắn vào field {@code email}. */
public class DuplicateEmailException extends RuntimeException {

    public DuplicateEmailException() {
        super("Email này đã được đăng ký. Bạn hãy đăng nhập hoặc dùng email khác.");
    }
}
