package com.gotrips.gotrips_api.user;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.gotrips.gotrips_api.config.AdminSecurityConfig.AdminAuthentication;
import com.gotrips.gotrips_api.config.OpenApiConfig;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/admin/staff")
@Tag(name = "Quản trị nhân viên")
@SecurityRequirement(name = OpenApiConfig.ADMIN_COOKIE_SCHEME)
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
@RequiredArgsConstructor
class AdminStaffController {

    private final AdminStaffService staff;

    @GetMapping
    @Operation(operationId = "listAdminStaff", summary = "Danh sách tài khoản nhân viên",
            description = "Chỉ ADMIN được truy cập. Lỗi: 401 chưa đăng nhập, 403 thiếu quyền.")
    public List<AdminStaffResponse> list() {
        return staff.list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(operationId = "createAdminStaff", summary = "Tạo tài khoản nhân viên",
            description = "Chỉ ADMIN được truy cập. Lỗi: 400 dữ liệu sai, 401 chưa đăng nhập, 403 thiếu quyền hoặc CSRF, 409 trùng email.")
    public AdminStaffResponse create(AdminAuthentication auth, @Valid @RequestBody AdminCreateStaffRequest request) {
        return staff.create(auth.user().id(), request);
    }

    @PutMapping("/{id}/role")
    @Operation(operationId = "updateAdminStaffRole", summary = "Đổi vai trò nhân viên",
            description = "Chỉ ADMIN được truy cập. Lỗi: 400 dữ liệu sai, 401 chưa đăng nhập, 403 thiếu quyền hoặc CSRF, 404 không có nhân viên, 409 không thể đổi quyền.")
    public AdminStaffResponse updateRole(AdminAuthentication auth, @PathVariable UUID id,
            @Valid @RequestBody AdminStaffRoleRequest request) {
        return staff.updateRole(auth.user().id(), id, request.role());
    }

    @DeleteMapping("/{id}/role")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(operationId = "revokeAdminStaffRole", summary = "Thu hồi quyền nhân viên",
            description = "Chỉ ADMIN được truy cập. Lỗi: 401 chưa đăng nhập, 403 thiếu quyền hoặc CSRF, 404 không có nhân viên, 409 không thể thu hồi quyền.")
    public void revokeRole(AdminAuthentication auth, @PathVariable UUID id) {
        staff.revokeRole(auth.user().id(), id);
    }
}
