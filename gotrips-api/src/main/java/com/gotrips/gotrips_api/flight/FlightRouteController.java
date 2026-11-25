package com.gotrips.gotrips_api.flight;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.gotrips.gotrips_api.common.validation.ResultLimit;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/** Chặng bay phổ biến (công khai, không cần token). */
@RestController
@RequestMapping("/flight-routes")
@RequiredArgsConstructor
@Tag(name = "Vé máy bay", description = "Sân bay và chặng bay công khai cho website")
public class FlightRouteController {

    private final FlightService flightService;

    @Operation(operationId = "listPopularFlightRoutes", summary = "Chặng bay phổ biến cho Trang chủ",
            description = "Công khai. Theo độ phổ biến. Giá chỉ để tham khảo. "
                    + "Lỗi: 400 khi limit không phải số hoặc ngoài khoảng 1–50.")
    @GetMapping("/popular")
    public List<FlightRouteCardResponse> popular(
            @Parameter(description = "Số chặng bay tối đa", schema = @Schema(type = "integer", format = "int32",
                    minimum = "1", maximum = "50", defaultValue = "6"))
            @RequestParam(defaultValue = "6") @ResultLimit int limit) {
        return flightService.popularRoutes(limit);
    }
}
