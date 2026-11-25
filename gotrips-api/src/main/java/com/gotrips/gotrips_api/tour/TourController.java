package com.gotrips.gotrips_api.tour;

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
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;

/** Tour (công khai, không cần token). */
@RestController
@RequestMapping("/tours")
@RequiredArgsConstructor
@Tag(name = "Tour", description = "Danh sách và chi tiết tour công khai cho website")
public class TourController {

    private final TourService tourService;

    @Operation(operationId = "searchTours", summary = "Tìm tour: lọc, sắp xếp, phân trang",
            description = "Công khai. Chỉ tour ACTIVE. Mỗi trang " + TourSearchCalculator.PAGE_SIZE + " tour. "
                    + "date/guests chọn các chuyến còn đặt được thoả điều kiện, thẻ tour hiển thị giá/ngày của đúng "
                    + "các chuyến đó; tour không có chuyến nào thoả thì bị loại. Slug điểm đến không tồn tại cho kết "
                    + "quả rỗng. page vượt quá số trang được kẹp về trang cuối. "
                    + "Lỗi: 400 khi date không phải YYYY-MM-DD, guests ngoài 1–50, sort lạ hoặc page < 1.")
    @GetMapping
    public TourSearchResponse search(
            @Parameter(description = "Slug điểm đến, ví dụ da-lat")
            @RequestParam(required = false) @Size(max = 100) String destination,
            @Parameter(description = "Chữ tìm trong tên tour và tên điểm đến, không phân biệt dấu/hoa thường")
            @RequestParam(required = false) @Size(max = 100) String q,
            @Parameter(description = "Ngày khởi hành (YYYY-MM-DD)", schema = @Schema(type = "string", format = "date"))
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @Parameter(description = "Số khách: chuyến phải còn đủ chỗ", schema = @Schema(type = "integer",
                    format = "int32", minimum = "1", maximum = "50"))
            @RequestParam(required = false) @Min(1) @Max(50) Integer guests,
            @Parameter(description = "Kiểu sắp xếp", schema = @Schema(implementation = TourSort.class,
                    defaultValue = "FEATURED"))
            @RequestParam(defaultValue = "FEATURED") TourSort sort,
            @Parameter(description = "Trang (từ 1)", schema = @Schema(type = "integer", format = "int32",
                    minimum = "1", defaultValue = "1"))
            @RequestParam(defaultValue = "1") @Min(1) int page) {
        return tourService.search(destination, q, date, guests, sort, page);
    }

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

    @Operation(operationId = "getTour", summary = "Chi tiết một tour",
            description = "Công khai. Gồm mô tả, mọi chuyến khởi hành ở tương lai (kể cả chuyến đã đầy) và đánh giá. "
                    + "Lỗi: 404 khi slug không tồn tại hoặc tour đang bị ẩn (HIDDEN).")
    @GetMapping("/{slug}")
    public TourDetailResponse detail(@Parameter(description = "Slug của tour") @PathVariable String slug) {
        return tourService.detail(slug);
    }
}
