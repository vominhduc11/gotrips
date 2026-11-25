package com.gotrips.gotrips_api.hotel;

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

/** Khách sạn (công khai, không cần token). */
@RestController
@RequestMapping("/hotels")
@RequiredArgsConstructor
@Tag(name = "Khách sạn", description = "Danh sách khách sạn công khai cho website")
public class HotelController {

    private final HotelService hotelService;

    @Operation(operationId = "listFeaturedHotels", summary = "Khách sạn nổi bật cho Trang chủ",
            description = "Công khai. Chỉ khách sạn ACTIVE có ít nhất một loại phòng, sắp theo điểm đánh giá giảm dần. "
                    + "Lỗi: 400 khi limit không phải số hoặc ngoài khoảng 1–50.")
    @GetMapping("/featured")
    public List<HotelCardResponse> featured(
            @Parameter(description = "Số khách sạn tối đa", schema = @Schema(type = "integer", format = "int32",
                    minimum = "1", maximum = "50", defaultValue = "4"))
            @RequestParam(defaultValue = "4") @ResultLimit int limit) {
        return hotelService.featured(limit);
    }
}
