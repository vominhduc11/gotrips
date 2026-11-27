package com.gotrips.gotrips_api.flight;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.gotrips.gotrips_api.config.OpenApiConfig;
import com.gotrips.gotrips_api.flight.AdminFlightReferences.AdminAirportResponse;
import com.gotrips.gotrips_api.flight.AdminFlightReferences.AdminCreateAirportRequest;
import com.gotrips.gotrips_api.flight.AdminFlightReferences.AdminUpdateAirportRequest;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/admin/airports")
@RequiredArgsConstructor
@Tag(name = "Quản trị sân bay")
@SecurityRequirement(name = OpenApiConfig.ADMIN_COOKIE_SCHEME)
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class AdminAirportController {

    private final AdminFlightReferenceService service;

    @Operation(operationId = "listAdminAirports", summary = "Danh sách sân bay", description = "Dành cho STAFF và ADMIN.")
    @GetMapping
    public List<AdminAirportResponse> list() {
        return service.listAirports();
    }

    @Operation(operationId = "createAdminAirport", summary = "Thêm sân bay",
            description = "Dành cho STAFF và ADMIN. Lỗi 400 khi dữ liệu sai, 409 khi trùng mã.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AdminAirportResponse create(@Valid @RequestBody AdminCreateAirportRequest request) {
        return service.createAirport(request);
    }

    @Operation(operationId = "updateAdminAirport", summary = "Sửa sân bay",
            description = "Dành cho STAFF và ADMIN. Mã giữ nguyên. Lỗi 400 hoặc 404.")
    @PutMapping("/{code}")
    public AdminAirportResponse update(@PathVariable String code, @Valid @RequestBody AdminUpdateAirportRequest request) {
        return service.updateAirport(code, request);
    }
}
