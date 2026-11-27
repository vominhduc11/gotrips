package com.gotrips.gotrips_api.flight;

import static com.gotrips.gotrips_api.flight.AdminFlightReferences.AIRLINE_CODE;
import static com.gotrips.gotrips_api.flight.AdminFlightReferences.AIRLINE_CODE_MESSAGE;
import static com.gotrips.gotrips_api.flight.AdminFlightReferences.AIRPORT_CODE;
import static com.gotrips.gotrips_api.flight.AdminFlightReferences.AIRPORT_CODE_MESSAGE;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.gotrips.gotrips_api.config.OpenApiConfig;
import com.gotrips.gotrips_api.flight.AdminFlightScheduleDtos.AdminCreateFlightScheduleRequest;
import com.gotrips.gotrips_api.flight.AdminFlightScheduleDtos.AdminFlightSchedulePageResponse;
import com.gotrips.gotrips_api.flight.AdminFlightScheduleDtos.AdminFlightScheduleResponse;
import com.gotrips.gotrips_api.flight.AdminFlightScheduleDtos.AdminUpdateFlightScheduleRequest;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/admin/flight-schedules")
@RequiredArgsConstructor
@Tag(name = "Quản trị lịch bay", description = "Quản lý lịch bay hằng ngày dành cho STAFF và ADMIN")
@SecurityRequirement(name = OpenApiConfig.ADMIN_COOKIE_SCHEME)
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class AdminFlightScheduleController {

    private final AdminFlightScheduleService service;

    @Operation(operationId = "listAdminFlightSchedules", summary = "Danh sách lịch bay",
            description = "Trang bắt đầu từ 1 và được kẹp về trang cuối. Có thể lọc đồng thời theo điểm đi, điểm đến và hãng.")
    @GetMapping
    public AdminFlightSchedulePageResponse list(
            @RequestParam(required = false) @Pattern(regexp = AIRPORT_CODE, message = AIRPORT_CODE_MESSAGE) String fromCode,
            @RequestParam(required = false) @Pattern(regexp = AIRPORT_CODE, message = AIRPORT_CODE_MESSAGE) String toCode,
            @RequestParam(required = false) @Pattern(regexp = AIRLINE_CODE, message = AIRLINE_CODE_MESSAGE) String airlineCode,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(defaultValue = "DEPART_TIME_ASC") AdminFlightScheduleSort sort) {
        return service.list(fromCode, toCode, airlineCode, page, size, sort);
    }

    @Operation(operationId = "createAdminFlightSchedule", summary = "Thêm lịch bay",
            description = "Lỗi 400 khi dữ liệu sai, 409 khi trùng số hiệu.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AdminFlightScheduleResponse create(@Valid @RequestBody AdminCreateFlightScheduleRequest request) {
        return service.create(request);
    }

    @Operation(operationId = "getAdminFlightSchedule", summary = "Chi tiết lịch bay", description = "Lỗi 404 nếu không tìm thấy.")
    @GetMapping("/{id}")
    public AdminFlightScheduleResponse get(@PathVariable long id) {
        return service.get(id);
    }

    @Operation(operationId = "updateAdminFlightSchedule", summary = "Sửa lịch bay",
            description = "Lỗi 409 nếu sửa giờ hoặc thời lượng của lịch bay đã có đơn, hoặc giảm ghế dưới mức đã bán.")
    @PutMapping("/{id}")
    public AdminFlightScheduleResponse update(@PathVariable long id,
            @Valid @RequestBody AdminUpdateFlightScheduleRequest request) {
        return service.update(id, request);
    }

    @Operation(operationId = "deleteAdminFlightSchedule", summary = "Xoá lịch bay chưa từng có đơn",
            description = "Lỗi 404 nếu không tìm thấy, 409 nếu từng có đơn.")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long id) {
        service.delete(id);
    }
}
