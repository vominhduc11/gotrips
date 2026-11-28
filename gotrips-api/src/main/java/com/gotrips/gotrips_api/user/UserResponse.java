package com.gotrips.gotrips_api.user;

import java.util.Set;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/** Thông tin tài khoản trả cho client. Tuyệt đối không có mật khẩu/chuỗi băm. */
@Schema(description = "Thông tin tài khoản")
public record UserResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "ban@example.com") String email,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "Nguyễn Văn An") String fullName,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, nullable = true, example = "0901 234 567") String phone,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Set<RoleName> roles) {
}
