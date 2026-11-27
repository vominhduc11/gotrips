package com.gotrips.gotrips_api.config;

import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;

/** Thông tin chung của spec OpenAPI (Swagger UI + client do Orval sinh). */
@Configuration
@OpenAPIDefinition(info = @Info(title = "GoTrips API", version = "0.0.1"))
@SecurityScheme(
        name = OpenApiConfig.BEARER_SCHEME,
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        description = "Access token lấy từ POST /auth/login")
@SecurityScheme(
        name = OpenApiConfig.ADMIN_COOKIE_SCHEME,
        type = SecuritySchemeType.APIKEY,
        in = SecuritySchemeIn.COOKIE,
        paramName = "gotrips_admin_session",
        description = "Cookie phiên từ POST /admin/auth/login. Thao tác ghi kèm X-XSRF-TOKEN.")
public class OpenApiConfig {

    public static final String BEARER_SCHEME = "bearerAuth";
    public static final String ADMIN_COOKIE_SCHEME = "adminCookieAuth";
}
