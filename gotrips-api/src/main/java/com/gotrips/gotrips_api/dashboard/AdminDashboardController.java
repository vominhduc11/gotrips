package com.gotrips.gotrips_api.dashboard;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.format.annotation.DateTimeFormat.ISO;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.gotrips.gotrips_api.config.OpenApiConfig;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/admin/dashboard")
@RequiredArgsConstructor
@Tag(name = "Quản trị tổng quan", description = "Số liệu vận hành dành cho nhân viên")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
@SecurityRequirement(name = OpenApiConfig.ADMIN_COOKIE_SCHEME)
public class AdminDashboardController {

    private final AdminDashboardService service;

    @Operation(operationId = "getAdminDashboard", summary = "Số liệu trang Tổng quan",
            description = "Khoảng ngày theo giờ Việt Nam, gồm cả hai đầu, tối đa 366 ngày. "
                    + "Lỗi: 400 khoảng không hợp lệ, 401 chưa đăng nhập, 403 thiếu quyền.")
    @GetMapping
    public AdminDashboardResponse get(
            @Parameter(description = "Mặc định 29 ngày trước ngày kết thúc", schema = @Schema(type = "string", format = "date"))
            @RequestParam(required = false) @DateTimeFormat(iso = ISO.DATE) LocalDate from,
            @Parameter(description = "Mặc định hôm nay theo giờ Việt Nam", schema = @Schema(type = "string", format = "date"))
            @RequestParam(required = false) @DateTimeFormat(iso = ISO.DATE) LocalDate to) {
        return service.get(from, to);
    }
}
