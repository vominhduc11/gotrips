package com.gotrips.gotrips_api.hotel;

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

/** Quản lý khách sạn (chỉ STAFF/ADMIN). */
@RestController
@RequestMapping("/admin/hotels")
@RequiredArgsConstructor
@Tag(name = "Quản trị khách sạn", description = "Tìm, thêm, sửa, ẩn/hiện, xoá mềm và khôi phục khách sạn")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
@SecurityRequirement(name = OpenApiConfig.ADMIN_COOKIE_SCHEME)
public class AdminHotelController {

    private final AdminHotelService service;

    @Operation(operationId = "listAdminHotels", summary = "Tìm, lọc và phân trang khách sạn",
            description = "page vượt quá số trang được kẹp về trang cuối. Lỗi: 400 bộ lọc không hợp lệ, 401, 403.")
    @GetMapping
    public AdminHotelPageResponse list(@Valid @ParameterObject @ModelAttribute AdminHotelFilters filters) {
        return service.list(filters);
    }

    @Operation(operationId = "getAdminHotel", summary = "Chi tiết một khách sạn (kể cả đã ẩn hoặc đã xoá)",
            description = "Lỗi: 401, 403, 404.")
    @GetMapping("/{id}")
    public AdminHotelDetailResponse get(@PathVariable long id) {
        return service.get(id);
    }

    @Operation(operationId = "createAdminHotel", summary = "Thêm khách sạn",
            description = "Khách sạn chưa hiện trên website cho tới khi có loại phòng. Lỗi: 400 dữ liệu, URL ảnh, tiện "
                    + "ích hoặc điểm đến không hợp lệ, 401, 403, 409 trùng slug; kèm errors[] khi gắn được vào ô.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AdminHotelDetailResponse create(@Valid @RequestBody AdminCreateHotelRequest request) {
        return service.create(request);
    }

    @Operation(operationId = "updateAdminHotel", summary = "Sửa nội dung khách sạn",
            description = "Thay toàn bộ tiện ích và bộ ảnh xem thêm. Lỗi: 400 dữ liệu không hợp lệ, 401, 403, 404, "
                    + "409 trùng slug hoặc khách sạn đã xoá; kèm errors[] khi gắn được vào ô.")
    @PutMapping("/{id}")
    public AdminHotelDetailResponse update(@PathVariable long id, @Valid @RequestBody AdminUpdateHotelRequest request) {
        return service.update(id, request);
    }

    @Operation(operationId = "updateAdminHotelStatus", summary = "Ẩn hoặc hiện khách sạn",
            description = "Lỗi: 400, 401, 403, 404, 409 khách sạn đã xoá.")
    @PatchMapping("/{id}/status")
    public AdminHotelDetailResponse updateStatus(@PathVariable long id,
            @Valid @RequestBody AdminHotelStatusRequest request) {
        return service.changeVisibility(id, request.status());
    }

    @Operation(operationId = "deleteAdminHotel", summary = "Xoá mềm khách sạn",
            description = "Khách sạn biến mất khỏi website, đơn cũ giữ nguyên. Lỗi: 401, 403, 404, 409 đã xoá.")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long id) {
        service.delete(id);
    }

    @Operation(operationId = "restoreAdminHotel", summary = "Khôi phục khách sạn đã xoá (về trạng thái ẩn)",
            description = "Lỗi: 401, 403, 404, 409 khách sạn chưa bị xoá.")
    @PostMapping("/{id}/restore")
    public AdminHotelDetailResponse restore(@PathVariable long id) {
        return service.restore(id);
    }
}
