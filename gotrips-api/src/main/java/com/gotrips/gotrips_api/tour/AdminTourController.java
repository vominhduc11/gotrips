package com.gotrips.gotrips_api.tour;

import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
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

/** Quản lý tour (chỉ STAFF/ADMIN). */
@RestController
@RequestMapping("/admin/tours")
@RequiredArgsConstructor
@Tag(name = "Quản trị tour", description = "Tìm, thêm, sửa, ẩn/hiện, xoá mềm và khôi phục tour")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
@SecurityRequirement(name = OpenApiConfig.ADMIN_COOKIE_SCHEME)
public class AdminTourController {

    private static final String WRITE_ERRORS =
            "Lỗi: 400 dữ liệu không hợp lệ, 401, 403, 404, 409 trùng slug hoặc tour đã xoá; kèm errors[] khi gắn "
                    + "được vào ô.";

    private final AdminTourService service;

    @Operation(operationId = "listAdminTours", summary = "Tìm, lọc và phân trang tour",
            description = "page vượt quá số trang được kẹp về trang cuối. Lỗi: 400 bộ lọc không hợp lệ, 401, 403.")
    @GetMapping
    public AdminTourPageResponse list(@Valid @ParameterObject @ModelAttribute AdminTourFilters filters) {
        return service.list(filters);
    }

    @Operation(operationId = "getAdminTour", summary = "Chi tiết một tour (kể cả đã ẩn hoặc đã xoá)",
            description = "Lỗi: 401, 403, 404.")
    @GetMapping("/{id}")
    public AdminTourDetailResponse get(@PathVariable long id) {
        return service.get(id);
    }

    @Operation(operationId = "createAdminTour", summary = "Thêm tour",
            description = "Lỗi: 400 dữ liệu, URL ảnh hoặc điểm đến không hợp lệ, 401, 403, 409 trùng slug.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AdminTourDetailResponse create(@Valid @RequestBody AdminCreateTourRequest request) {
        return service.create(request);
    }

    @Operation(operationId = "updateAdminTour", summary = "Sửa nội dung tour", description = WRITE_ERRORS)
    @PutMapping("/{id}")
    public AdminTourDetailResponse update(@PathVariable long id, @Valid @RequestBody AdminUpdateTourRequest request) {
        return service.update(id, request);
    }

    @Operation(operationId = "updateAdminTourStatus", summary = "Ẩn hoặc hiện tour",
            description = "Lỗi: 400, 401, 403, 404, 409 tour đã xoá.")
    @PatchMapping("/{id}/status")
    public AdminTourDetailResponse updateStatus(@PathVariable long id,
            @Valid @RequestBody AdminTourStatusRequest request) {
        return service.changeVisibility(id, request.status());
    }

    @Operation(operationId = "deleteAdminTour", summary = "Xoá mềm tour",
            description = "Tour biến mất khỏi website, đơn cũ giữ nguyên. Lỗi: 401, 403, 404, 409 đã xoá.")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long id) {
        service.delete(id);
    }

    @Operation(operationId = "restoreAdminTour", summary = "Khôi phục tour đã xoá (về trạng thái ẩn)",
            description = "Lỗi: 401, 403, 404, 409 tour chưa bị xoá.")
    @PostMapping("/{id}/restore")
    public AdminTourDetailResponse restore(@PathVariable long id) {
        return service.restore(id);
    }
}
