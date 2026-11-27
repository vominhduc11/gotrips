package com.gotrips.gotrips_api.user;

import java.util.UUID;

import org.springdoc.core.annotations.ParameterObject;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gotrips.gotrips_api.config.OpenApiConfig;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/admin/customers")
@Tag(name = "Quản trị khách hàng")
@SecurityRequirement(name = OpenApiConfig.ADMIN_COOKIE_SCHEME)
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
@RequiredArgsConstructor
class AdminCustomerController {

    private final AdminCustomerService customers;

    @GetMapping
    @Operation(operationId = "listAdminCustomers", summary = "Danh sách khách hàng",
            description = "Chỉ gồm tài khoản có CUSTOMER. Lỗi: 400 bộ lọc sai, 401 chưa đăng nhập, 403 thiếu quyền.")
    public AdminCustomerPageResponse list(@Valid @ParameterObject AdminCustomerFilters filters) {
        return customers.list(filters);
    }

    @GetMapping("/{id}")
    @Operation(operationId = "getAdminCustomer", summary = "Hồ sơ khách hàng",
            description = "Lỗi: 401 chưa đăng nhập, 403 thiếu quyền, 404 tài khoản không tồn tại hoặc không có CUSTOMER.")
    public AdminCustomerResponse get(@PathVariable UUID id) {
        return customers.get(id);
    }
}
