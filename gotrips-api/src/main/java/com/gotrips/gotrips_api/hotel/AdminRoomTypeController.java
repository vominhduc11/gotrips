package com.gotrips.gotrips_api.hotel;

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

/** Quản lý loại phòng của khách sạn (chỉ STAFF/ADMIN). */
@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@Tag(name = "Quản trị loại phòng", description = "Thêm, sửa và xoá loại phòng của khách sạn")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
@SecurityRequirement(name = OpenApiConfig.ADMIN_COOKIE_SCHEME)
public class AdminRoomTypeController {

    private final AdminRoomTypeService service;

    @Operation(operationId = "listAdminRoomTypes", summary = "Mọi loại phòng của một khách sạn",
            description = "Giá tăng dần, rồi id. Lỗi: 401, 403, 404 không có khách sạn.")
    @GetMapping("/hotels/{id}/room-types")
    public List<AdminRoomTypeResponse> list(@PathVariable long id) {
        return service.list(id);
    }

    @Operation(operationId = "createAdminRoomType", summary = "Thêm loại phòng",
            description = "Lỗi: 400 dữ liệu, URL ảnh hoặc tiện ích không hợp lệ, 401, 403, 404, 409 khách sạn đã xoá.")
    @PostMapping("/hotels/{id}/room-types")
    @ResponseStatus(HttpStatus.CREATED)
    public AdminRoomTypeResponse create(@PathVariable long id, @Valid @RequestBody AdminRoomTypeRequest request) {
        return service.create(id, request);
    }

    @Operation(operationId = "updateAdminRoomType", summary = "Sửa loại phòng",
            description = "Thay toàn bộ tiện ích và bộ ảnh; đổi giá không ảnh hưởng đơn đã đặt. Lỗi: 400, 401, 403, "
                    + "404, 409 khách sạn đã xoá hoặc giảm tổng số phòng dưới mức đang được giữ (field totalRooms, "
                    + "kèm mức tối thiểu).")
    @PutMapping("/room-types/{id}")
    public AdminRoomTypeResponse update(@PathVariable long id, @Valid @RequestBody AdminRoomTypeRequest request) {
        return service.update(id, request);
    }

    @Operation(operationId = "deleteAdminRoomType", summary = "Xoá loại phòng chưa từng có đơn",
            description = "Lỗi: 401, 403, 404, 409 loại phòng đã có đơn (kể cả đơn đã huỷ) hoặc khách sạn đã xoá.")
    @DeleteMapping("/room-types/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long id) {
        service.delete(id);
    }
}
