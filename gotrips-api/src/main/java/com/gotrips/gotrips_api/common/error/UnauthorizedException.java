package com.gotrips.gotrips_api.common.error;

/**
 * Không xác thực được người gọi (sai email/mật khẩu, phiên không còn hợp lệ) → HTTP 401.
 * {@link GlobalExceptionHandler} chuyển thành {@code ProblemDetail}. {@code message} được hiển thị cho
 * người dùng nên phải là câu tiếng Việt, không chứa thông tin nội bộ.
 */
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException(String message) {
        super(message);
    }
}
