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
import com.gotrips.gotrips_api.flight.AdminFlightReferences.AdminCreateAirlineRequest;
import com.gotrips.gotrips_api.flight.AdminFlightReferences.AdminUpdateAirlineRequest;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/admin/airlines")
@RequiredArgsConstructor
@Tag(name = "Quản trị hãng bay")
@SecurityRequirement(name = OpenApiConfig.ADMIN_COOKIE_SCHEME)
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class AdminAirlineController {

    private final AdminFlightReferenceService service;

    @Operation(operationId = "listAdminAirlines", summary = "Danh sách hãng bay", description = "Dành cho STAFF và ADMIN.")
    @GetMapping
    public List<AirlineResponse> list() {
        return service.listAirlines();
    }

    @Operation(operationId = "createAdminAirline", summary = "Thêm hãng bay",
            description = "Dành cho STAFF và ADMIN. Lỗi 400 khi dữ liệu sai, 409 khi trùng mã.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AirlineResponse create(@Valid @RequestBody AdminCreateAirlineRequest request) {
        return service.createAirline(request);
    }

    @Operation(operationId = "updateAdminAirline", summary = "Sửa hãng bay",
            description = "Dành cho STAFF và ADMIN. Mã giữ nguyên. Lỗi 400 hoặc 404.")
    @PutMapping("/{code}")
    public AirlineResponse update(@PathVariable String code, @Valid @RequestBody AdminUpdateAirlineRequest request) {
        return service.updateAirline(code, request);
    }
}
