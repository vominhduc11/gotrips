package com.gotrips.gotrips_api.hotel;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.gotrips.gotrips_api.common.validation.ResultLimit;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;

/** Khách sạn (công khai, không cần token). */
@RestController
@RequestMapping("/hotels")
@RequiredArgsConstructor
@Tag(name = "Khách sạn", description = "Tìm kiếm và chi tiết khách sạn công khai cho website")
public class HotelController {

    private final HotelService hotelService;

    @Operation(operationId = "listFeaturedHotels", summary = "Khách sạn nổi bật cho Trang chủ",
            description = "Công khai. Chỉ khách sạn ACTIVE có ít nhất một loại phòng, sắp theo điểm đánh giá giảm dần. "
                    + "Cũng dùng làm danh sách gợi ý ở trang /hotels (limit tối đa 50). "
                    + "Lỗi: 400 khi limit không phải số hoặc ngoài khoảng 1–50.")
    @GetMapping("/featured")
    public List<HotelCardResponse> featured(
            @Parameter(description = "Số khách sạn tối đa", schema = @Schema(type = "integer", format = "int32",
                    minimum = "1", maximum = "50", defaultValue = "4"))
            @RequestParam(defaultValue = "4") @ResultLimit int limit) {
        return hotelService.featured(limit);
    }

    @Operation(operationId = "searchHotels", summary = "Tìm khách sạn theo điểm đến và khoảng ngày",
            description = "Công khai. Chỉ khách sạn ACTIVE của điểm đến, mỗi khách sạn kèm loại phòng rẻ nhất còn chứa "
                    + "đủ số khách với số phòng đã chọn và tổng tiền cả kỳ; khách sạn không có phòng nào đủ chỗ bị bỏ. "
                    + "Sắp theo tổng tiền tăng dần, rồi điểm đánh giá giảm dần, rồi id; không phân trang. "
                    + "Slug điểm đến không tồn tại cho kết quả rỗng (destinationName là null). "
                    + "Lỗi: 400 khi thiếu/sai kiểu tham số, ngày nhận ở quá khứ (theo giờ Việt Nam), ngày trả không "
                    + "sau ngày nhận, quá 30 đêm hoặc số phòng nhiều hơn số khách; mỗi lỗi kèm errors[{field,message}].")
    @GetMapping
    public HotelSearchResponse search(
            @Parameter(description = "Slug điểm đến, ví dụ da-lat", required = true)
            @RequestParam @NotBlank @Size(max = 100) String destination,
            @Parameter(description = "Ngày nhận phòng (YYYY-MM-DD)", required = true,
                    schema = @Schema(type = "string", format = "date"))
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @Parameter(description = "Ngày trả phòng (YYYY-MM-DD), sau ngày nhận tối đa 30 đêm", required = true,
                    schema = @Schema(type = "string", format = "date"))
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut,
            @Parameter(description = "Tổng số khách", schema = @Schema(type = "integer", format = "int32",
                    minimum = "1", maximum = "30", defaultValue = "2"))
            @RequestParam(defaultValue = "2") @Min(1) @Max(HotelStayCalculator.MAX_GUESTS) int guests,
            @Parameter(description = "Số phòng, không nhiều hơn số khách", schema = @Schema(type = "integer",
                    format = "int32", minimum = "1", maximum = "10", defaultValue = "1"))
            @RequestParam(defaultValue = "1") @Min(1) @Max(HotelStayCalculator.MAX_ROOMS) int rooms) {
        return hotelService.search(destination, checkIn, checkOut, guests, rooms);
    }

    @Operation(operationId = "getHotel", summary = "Chi tiết khách sạn theo slug",
            description = "Công khai. Gồm giới thiệu, tiện ích, giờ nhận/trả phòng và các loại phòng (giá tăng dần). "
                    + "Lỗi: 404 khi không có khách sạn, khách sạn đang ẩn hoặc chưa có loại phòng nào (không phân biệt).")
    @GetMapping("/{slug}")
    public HotelDetailResponse detail(@Parameter(description = "Slug của khách sạn") @PathVariable String slug) {
        return hotelService.detail(slug);
    }
}
