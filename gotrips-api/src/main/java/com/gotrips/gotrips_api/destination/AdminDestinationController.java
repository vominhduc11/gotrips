package com.gotrips.gotrips_api.destination;

import java.util.List;

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

import com.gotrips.gotrips_api.config.OpenApiConfig;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/** Quản lý điểm đến (chỉ STAFF/ADMIN). Tag bắt đầu bằng "Quản trị " để Orval của admin lấy, của web bỏ. */
@RestController
@RequestMapping("/admin/destinations")
@RequiredArgsConstructor
@Tag(name = "Quản trị điểm đến", description = "Danh mục điểm đến")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
@SecurityRequirement(name = OpenApiConfig.ADMIN_COOKIE_SCHEME)
public class AdminDestinationController {

    private final AdminDestinationService service;

    @Operation(operationId = "listAdminDestinations", summary = "Mọi điểm đến kèm số tour và khách sạn",
            description = "Theo id. Lỗi: 401 chưa đăng nhập, 403 thiếu quyền.")
    @GetMapping
    public List<AdminDestinationResponse> list() {
        return service.list();
    }

    @Operation(operationId = "createAdminDestination", summary = "Thêm điểm đến",
            description = "Lỗi: 400 dữ liệu hoặc URL ảnh không hợp lệ, 401, 403, 409 trùng slug; kèm errors[].")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AdminDestinationResponse create(@Valid @RequestBody AdminDestinationRequest request) {
        return service.create(request);
    }

    @Operation(operationId = "updateAdminDestination", summary = "Sửa điểm đến",
            description = "Lỗi: 400 dữ liệu hoặc URL ảnh không hợp lệ, 401, 403, 404, 409 trùng slug; kèm errors[].")
    @PutMapping("/{id}")
    public AdminDestinationResponse update(@PathVariable long id, @Valid @RequestBody AdminDestinationRequest request) {
        return service.update(id, request);
    }

    @Operation(operationId = "deleteAdminDestination", summary = "Xoá điểm đến chưa được dùng",
            description = "Lỗi: 401, 403, 404, 409 còn tour hoặc khách sạn tham chiếu (kể cả đã xoá mềm).")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long id) {
        service.delete(id);
    }
}
