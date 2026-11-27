package com.gotrips.gotrips_api.hotel;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gotrips.gotrips_api.config.OpenApiConfig;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/** Danh mục tiện ích cho form khách sạn và loại phòng (chỉ STAFF/ADMIN, chỉ đọc). */
@RestController
@RequestMapping("/admin/amenities")
@RequiredArgsConstructor
@Tag(name = "Quản trị tiện ích", description = "Danh mục tiện ích chuẩn (chỉ đọc)")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
@SecurityRequirement(name = OpenApiConfig.ADMIN_COOKIE_SCHEME)
public class AdminAmenityController {

    private final AdminHotelService service;

    @Operation(operationId = "listAdminAmenities", summary = "Mọi tiện ích trong danh mục kèm phạm vi",
            description = "Theo thứ tự danh mục. Lỗi: 401, 403.")
    @GetMapping
    public List<AdminAmenityResponse> list() {
        return service.listAmenities();
    }
}
