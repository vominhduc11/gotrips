package com.gotrips.gotrips_api.common.error;

/**
 * Yêu cầu hợp lệ về kiểu nhưng sai luật nghiệp vụ gắn với MỘT tham số (ngày nhận phòng ở quá khứ, ngày trả không sau
 * ngày nhận, số phòng nhiều hơn số khách...): {@code GlobalExceptionHandler} trả 400 kèm {@code errors[{field,message}]}
 * để web gắn đúng vào ô nhập.
 *
 * <p>Dùng cho luật mà annotation {@code jakarta.validation} không biểu diễn được: cần "hôm nay" ({@code Clock}) hoặc cần
 * so sánh nhiều tham số với nhau. Ràng buộc khoảng giá trị của từng tham số vẫn đặt bằng {@code @Min/@Max/@Size}.
 * {@code message} là câu tiếng Việt an toàn để hiển thị.
 */
public class InvalidRequestException extends RuntimeException {

    private final String field;

    public InvalidRequestException(String field, String message) {
        super(message);
        this.field = field;
    }

    /** Tên tham số bị sai, đúng như client gửi (ví dụ {@code checkIn}). */
    public String getField() {
        return field;
    }
}
