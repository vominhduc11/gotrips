package com.gotrips.gotrips_api.tour;

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

/** Tour (công khai, không cần token). */
@RestController
@RequestMapping("/tours")
@RequiredArgsConstructor
@Tag(name = "Tour", description = "Danh sách tour công khai cho website")
public class TourController {

    private final TourService tourService;

    @Operation(operationId = "listFeaturedTours", summary = "Tour nổi bật cho Trang chủ",
            description = "Công khai. Chỉ tour ACTIVE + nổi bật còn ít nhất một chuyến đặt được, theo id. "
                    + "Lỗi: 400 khi limit không phải số hoặc ngoài khoảng 1–50.")
    @GetMapping("/featured")
    public List<TourCardResponse> featured(
            @Parameter(description = "Số tour tối đa", schema = @Schema(type = "integer", format = "int32",
                    minimum = "1", maximum = "50", defaultValue = "8"))
            @RequestParam(defaultValue = "8") @ResultLimit int limit) {
        return tourService.featured(limit);
    }
}
