package com.gotrips.gotrips_api.common.error;

import lombok.Getter;

/**
 * Yêu cầu hợp lệ nhưng trạng thái hiện tại của dữ liệu không cho phép (hết chỗ, hết phòng, hết ghế, đơn đã đổi trạng
 * thái): {@code GlobalExceptionHandler} trả 409. Có {@code field} thì kèm {@code errors[{field,message}]} để web gắn
 * đúng chỗ; {@code message} là câu tiếng Việt an toàn để hiển thị.
 */
public class ConflictException extends RuntimeException {

    /** Tên field trong request, đúng như client gửi; có thể {@code null}. */
    @Getter
    private final String field;

    public ConflictException(String field, String message) {
        super(message);
        this.field = field;
    }

    /** Lỗi không gắn với ô nhập nào (ví dụ thao tác của nhân viên sai trạng thái). */
    public ConflictException(String message) {
        this(null, message);
    }
}
