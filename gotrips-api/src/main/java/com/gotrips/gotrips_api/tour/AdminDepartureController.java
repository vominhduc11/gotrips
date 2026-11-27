package com.gotrips.gotrips_api.tour;

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

/** Quản lý chuyến khởi hành (chỉ STAFF/ADMIN). */
@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@Tag(name = "Quản trị chuyến khởi hành", description = "Thêm, sửa, xoá, đóng và mở bán chuyến của tour")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
@SecurityRequirement(name = OpenApiConfig.ADMIN_COOKIE_SCHEME)
public class AdminDepartureController {

    private final AdminDepartureService service;

    @Operation(operationId = "listAdminDepartures", summary = "Mọi chuyến của một tour, kể cả đã qua",
            description = "Theo ngày. Lỗi: 401, 403, 404 không có tour.")
    @GetMapping("/tours/{id}/departures")
    public List<AdminDepartureResponse> list(@PathVariable long id) {
        return service.list(id);
    }

    @Operation(operationId = "createAdminDeparture", summary = "Thêm chuyến khởi hành",
            description = "Lỗi: 400 ngày hoặc giá không hợp lệ, 401, 403, 404, 409 trùng ngày hoặc tour đã xoá.")
    @PostMapping("/tours/{id}/departures")
    @ResponseStatus(HttpStatus.CREATED)
    public AdminDepartureResponse create(@PathVariable long id, @Valid @RequestBody AdminDepartureRequest request) {
        return service.create(id, request);
    }

    @Operation(operationId = "updateAdminDeparture", summary = "Sửa chuyến khởi hành",
            description = "Đổi giá không ảnh hưởng đơn đã đặt. Lỗi: 400, 401, 403, 404, 409 chuyến đã qua, đã có "
                    + "khách nên không đổi ngày, trùng ngày, hoặc tổng chỗ thấp hơn số đã đặt.")
    @PutMapping("/departures/{id}")
    public AdminDepartureResponse update(@PathVariable long id, @Valid @RequestBody AdminDepartureRequest request) {
        return service.update(id, request);
    }

    @Operation(operationId = "deleteAdminDeparture", summary = "Xoá chuyến chưa từng có khách đặt",
            description = "Lỗi: 401, 403, 404, 409 chuyến đã có khách đặt (dùng đóng bán) hoặc tour đã xoá.")
    @DeleteMapping("/departures/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long id) {
        service.delete(id);
    }

    @Operation(operationId = "closeAdminDeparture", summary = "Đóng bán chuyến",
            description = "Website hiện chuyến là hết chỗ; huỷ đơn không mở bán lại. Lỗi: 401, 403, 404, 409 chuyến "
                    + "đã qua, đã đóng bán hoặc tour đã xoá.")
    @PostMapping("/departures/{id}/close")
    public AdminDepartureResponse close(@PathVariable long id) {
        return service.close(id);
    }

    @Operation(operationId = "reopenAdminDeparture", summary = "Mở bán lại chuyến đã đóng",
            description = "Lỗi: 401, 403, 404, 409 chuyến đã qua, đang mở bán hoặc tour đã xoá.")
    @PostMapping("/departures/{id}/reopen")
    public AdminDepartureResponse reopen(@PathVariable long id) {
        return service.reopen(id);
    }
}
