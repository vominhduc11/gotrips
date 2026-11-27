package com.gotrips.gotrips_api.common.error;

import org.hibernate.exception.ConstraintViolationException;

/**
 * Đọc tên ràng buộc DB từ lỗi ghi dữ liệu. Ràng buộc của DB là chốt chặn khi hai request đồng thời cùng qua được bước
 * kiểm trước; nơi gọi đổi nó thành lỗi gắn đúng ô.
 *
 * <p>Sau một lỗi như vậy PostgreSQL huỷ transaction: nơi gọi phải ném lỗi ngay, không chạy thêm câu SQL nào.
 */
public final class ConstraintViolations {

    private ConstraintViolations() {
    }

    public static boolean violates(Throwable error, String constraintName) {
        for (Throwable cause = error; cause != null; cause = cause.getCause()) {
            if (cause instanceof ConstraintViolationException violation) {
                return constraintName.equalsIgnoreCase(violation.getConstraintName());
            }
        }
        return false;
    }
}
