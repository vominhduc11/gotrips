package com.gotrips.gotrips_api.auth;

import com.gotrips.gotrips_api.user.UserResponse;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Kết quả đăng nhập thành công")
public record LoginResponse(
        @Schema(description = "JWT, gửi ở header Authorization: Bearer <token>", requiredMode = Schema.RequiredMode.REQUIRED)
        String accessToken,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "Bearer") String tokenType,
        @Schema(description = "Số giây token còn hiệu lực", requiredMode = Schema.RequiredMode.REQUIRED, example = "604800")
        long expiresIn,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UserResponse user) {
}
