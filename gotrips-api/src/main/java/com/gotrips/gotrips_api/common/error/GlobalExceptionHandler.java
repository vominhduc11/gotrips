package com.gotrips.gotrips_api.common.error;

import java.util.List;

import org.springframework.core.MethodParameter;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

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

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(invalidDataProblem(errors));
    }

    /**
     * Lỗi validation của tham số controller ({@code @RequestParam}, {@code @PathVariable} có {@code @Min},
     * {@code @Max}...): Spring ném {@link HandlerMethodValidationException} chứ không phải
     * {@code MethodArgumentNotValidException}. Trả cùng format {@code errors[]} (field = tên tham số).
     */
    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ProblemDetail> handleMethodValidation(HandlerMethodValidationException ex) {
        List<FieldViolation> errors = ex.getParameterValidationResults().stream()
                .flatMap(result -> result.getResolvableErrors().stream()
                        .map(error -> new FieldViolation(parameterName(result.getMethodParameter()),
                                error.getDefaultMessage())))
                .toList();

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(invalidDataProblem(errors));
    }

    /** Tham số sai kiểu (ví dụ {@code ?limit=abc}): 400, cùng format {@code errors[]}. */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ProblemDetail> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        List<FieldViolation> errors = List.of(
                new FieldViolation(ex.getName(), "Giá trị của " + ex.getName() + " không hợp lệ."));

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(invalidDataProblem(errors));
    }

    /** Email đã có tài khoản: 409, kèm lỗi theo field để form gắn đúng vào ô email. */
    @ExceptionHandler(DuplicateEmailException.class)
    public ResponseEntity<ProblemDetail> handleDuplicateEmail(DuplicateEmailException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        problem.setTitle("Email đã được đăng ký");
        problem.setProperty("errors", List.of(new FieldViolation("email", ex.getMessage())));

        return ResponseEntity.status(HttpStatus.CONFLICT).body(problem);
    }

    /** Không xác thực được người gọi: 401. {@code detail} là câu tiếng Việt an toàn để hiển thị cho người dùng. */
    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ProblemDetail> handleUnauthorized(UnauthorizedException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, ex.getMessage());
        problem.setTitle("Chưa xác thực");

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .header(HttpHeaders.WWW_AUTHENTICATE, "Bearer")
                .body(problem);
    }

    private static ProblemDetail invalidDataProblem(List<FieldViolation> errors) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "Dữ liệu gửi lên không hợp lệ");
        problem.setTitle("Dữ liệu không hợp lệ");
        problem.setProperty("errors", errors);
        return problem;
    }

    /** Tên tham số mà client nhìn thấy: ưu tiên tên khai trong {@code @RequestParam}, rồi tên tham số Java. */
    private static String parameterName(MethodParameter parameter) {
        RequestParam requestParam = parameter.getParameterAnnotation(RequestParam.class);
        if (requestParam != null && !requestParam.name().isEmpty()) {
            return requestParam.name();
        }
        String name = parameter.getParameterName();
        return name != null ? name : "parameter";
    }

    /** Lỗi của một field: tên field và thông điệp validation. */
    public record FieldViolation(String field, String message) {
    }
}
