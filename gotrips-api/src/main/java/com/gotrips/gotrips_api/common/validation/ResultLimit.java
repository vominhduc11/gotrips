package com.gotrips.gotrips_api.common.validation;

import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.ElementType.PARAMETER;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import jakarta.validation.ReportAsSingleViolation;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/**
 * Số phần tử tối đa client được xin ở các danh sách công khai ({@code ?limit=}): từ {@value #MIN} đến {@value #MAX}.
 * Gộp {@code @Min} + {@code @Max} thành một ràng buộc để mọi endpoint dùng chung một luật và một thông báo lỗi,
 * và chặn client xin cả bảng.
 */
@Documented
@Constraint(validatedBy = {})
@Target({ PARAMETER, FIELD })
@Retention(RUNTIME)
@Min(ResultLimit.MIN)
@Max(ResultLimit.MAX)
@ReportAsSingleViolation
public @interface ResultLimit {

    int MIN = 1;
    int MAX = 50;

    String message() default "limit phải từ 1 đến 50.";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
