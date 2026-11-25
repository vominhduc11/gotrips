package com.gotrips.gotrips_api.common.validation;

import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.ElementType.PARAMETER;
import static java.lang.annotation.ElementType.RECORD_COMPONENT;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

/**
 * Chuỗi mã hoá UTF-8 không được vượt quá {@link #value()} byte.
 * Dùng cho mật khẩu: BCrypt chỉ xử lý 72 byte đầu, mà {@code @Size} đếm ký tự nên không đủ
 * (chữ có dấu như "ế" chiếm 3 byte).
 */
@Documented
@Constraint(validatedBy = MaxUtf8BytesValidator.class)
@Target({ FIELD, PARAMETER, RECORD_COMPONENT })
@Retention(RUNTIME)
public @interface MaxUtf8Bytes {

    int value();

    String message() default "Giá trị quá dài.";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
