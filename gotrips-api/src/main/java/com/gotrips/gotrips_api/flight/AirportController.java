package com.gotrips.gotrips_api.flight;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/** Sân bay (công khai, không cần token). */
@RestController
@RequestMapping("/airports")
@RequiredArgsConstructor
@Tag(name = "Vé máy bay", description = "Sân bay và chặng bay công khai cho website")
public class AirportController {

    private final FlightService flightService;

    @Operation(operationId = "listAirports", summary = "Danh sách sân bay",
            description = "Công khai. Theo thứ tự gợi ý: các đầu mối lớn trước.")
    @GetMapping
    public List<AirportResponse> list() {
        return flightService.listAirports();
    }
}
