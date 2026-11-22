package com.gotrips.gotrips_api.common.error;

import java.util.List;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Xử lý lỗi tập trung cho toàn bộ API, trả về {@link ProblemDetail} (RFC 9457).
 * Đây là nơi duy nhất định nghĩa format lỗi; controller không tự đặt format khác.
 */
// Đặt HIGHEST_PRECEDENCE để chạy trước advice mặc định của Spring Boot
// (bật bởi spring.mvc.problemdetails.enabled), tránh hai advice cùng xử lý một exception.
@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Lỗi validation của {@code @Valid} trên request body: trả 400 kèm danh sách lỗi theo từng field
     * để frontend gắn lỗi đúng vào ô nhập liệu.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidation(MethodArgumentNotValidException ex) {
        List<FieldViolation> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> new FieldViolation(fe.getField(), fe.getDefaultMessage()))
                .toList();

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "Dữ liệu gửi lên không hợp lệ");
        problem.setTitle("Dữ liệu không hợp lệ");
        problem.setProperty("errors", errors);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problem);
    }

    /** Lỗi của một field: tên field và thông điệp validation. */
    public record FieldViolation(String field, String message) {
    }
}
