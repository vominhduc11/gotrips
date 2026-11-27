package com.gotrips.gotrips_api.flight;

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
import com.gotrips.gotrips_api.flight.AdminFlightRouteDtos.AdminFlightRouteOrderRequest;
import com.gotrips.gotrips_api.flight.AdminFlightRouteDtos.AdminFlightRouteRequest;
import com.gotrips.gotrips_api.flight.AdminFlightRouteDtos.AdminFlightRouteResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/admin/flight-routes")
@RequiredArgsConstructor
@Tag(name = "Quản trị chặng bay phổ biến", description = "Quản lý chặng gợi ý dành cho STAFF và ADMIN")
@SecurityRequirement(name = OpenApiConfig.ADMIN_COOKIE_SCHEME)
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class AdminFlightRouteController {

    private final AdminFlightRouteService service;

    @Operation(operationId = "listAdminFlightRoutes", summary = "Toàn bộ chặng bay phổ biến theo thứ tự hiển thị")
    @GetMapping
    public List<AdminFlightRouteResponse> list() {
        return service.list();
    }

    @Operation(operationId = "createAdminFlightRoute", summary = "Thêm chặng bay phổ biến vào cuối danh sách",
            description = "Lỗi 400 khi dữ liệu sai, 409 khi trùng cặp điểm đi và điểm đến.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AdminFlightRouteResponse create(@Valid @RequestBody AdminFlightRouteRequest request) {
        return service.create(request);
    }

    @Operation(operationId = "updateAdminFlightRoute", summary = "Sửa chặng bay phổ biến",
            description = "Lỗi 400 khi dữ liệu sai, 404 khi không tìm thấy chặng, 409 khi trùng cặp điểm đi và điểm đến.")
    @PutMapping("/{id}")
    public AdminFlightRouteResponse update(@PathVariable long id, @Valid @RequestBody AdminFlightRouteRequest request) {
        return service.update(id, request);
    }

    @Operation(operationId = "deleteAdminFlightRoute", summary = "Xoá chặng bay phổ biến",
            description = "Lỗi 404 khi không tìm thấy chặng. Ảnh minh hoạ của đơn vé cũ có thể đổi.")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long id) {
        service.delete(id);
    }

    @Operation(operationId = "updateAdminFlightRouteOrder", summary = "Lưu thứ tự mới của toàn bộ chặng bay phổ biến",
            description = "Hai danh sách phải chứa cùng tập id. Lỗi 409 khi thứ tự gốc đã cũ.")
    @PutMapping("/order")
    public List<AdminFlightRouteResponse> updateOrder(@Valid @RequestBody AdminFlightRouteOrderRequest request) {
        return service.updateOrder(request);
    }
}
