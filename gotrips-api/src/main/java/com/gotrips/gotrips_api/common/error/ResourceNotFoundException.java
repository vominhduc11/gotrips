package com.gotrips.gotrips_api.common.error;

/**
 * Không có tài nguyên được yêu cầu (hoặc tài nguyên đang bị ẩn nên không được lộ ra): {@code GlobalExceptionHandler}
 * trả 404. {@code message} là câu tiếng Việt an toàn để hiển thị, không chứa dữ liệu nội bộ.
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
