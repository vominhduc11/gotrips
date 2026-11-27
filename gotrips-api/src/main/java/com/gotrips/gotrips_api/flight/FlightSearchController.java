package com.gotrips.gotrips_api.flight;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;

/** Tìm chuyến bay (công khai, không cần token). */
@RestController
@RequestMapping("/flights")
@RequiredArgsConstructor
@Tag(name = "Vé máy bay", description = "Sân bay và chặng bay công khai cho website")
public class FlightSearchController {

    private static final String AIRPORT_CODE = "[A-Z]{3}";

    private final FlightSearchService flightSearchService;

    @Operation(operationId = "searchFlights", summary = "Tìm chuyến bay theo chặng, ngày và hạng ghế",
            description = "Công khai. Các chuyến trong ngày, sắp theo giờ cất cánh rồi id; kèm giá, ghế còn lại và "
                    + "isBookable cho số hành khách của lượt tìm. Mã sân bay lạ cho danh sách rỗng. "
                    + "Lỗi: 400 khi thiếu/sai kiểu tham số, điểm đi trùng điểm đến, ngày ở quá khứ (giờ Việt Nam), "
                    + "không có người lớn, em bé nhiều hơn người lớn hoặc quá 9 hành khách; kèm errors[{field,message}].")
    @GetMapping
    public List<FlightOptionResponse> search(
            @Parameter(description = "Mã IATA sân bay đi", required = true, example = "SGN")
            @RequestParam @Pattern(regexp = AIRPORT_CODE, message = "Vui lòng chọn điểm đi.") String from,
            @Parameter(description = "Mã IATA sân bay đến", required = true, example = "HAN")
            @RequestParam @Pattern(regexp = AIRPORT_CODE, message = "Vui lòng chọn điểm đến.") String to,
            @Parameter(description = "Ngày bay (YYYY-MM-DD)", required = true,
                    schema = @Schema(type = "string", format = "date"))
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @Parameter(description = "Hạng ghế", schema = @Schema(implementation = CabinClass.class,
                    defaultValue = "ECONOMY"))
            @RequestParam(defaultValue = "ECONOMY") CabinClass cabin,
            @Parameter(description = "Số người lớn", schema = @Schema(type = "integer", format = "int32",
                    minimum = "1", maximum = "9", defaultValue = "1"))
            @RequestParam(defaultValue = "1") @Min(1) @Max(FlightSearchRules.MAX_PASSENGERS) int adults,
            @Parameter(description = "Số trẻ em", schema = @Schema(type = "integer", format = "int32",
                    minimum = "0", maximum = "9", defaultValue = "0"))
            @RequestParam(defaultValue = "0") @Min(0) @Max(FlightSearchRules.MAX_PASSENGERS) int children,
            @Parameter(description = "Số em bé (không nhiều hơn số người lớn)", schema = @Schema(type = "integer",
                    format = "int32", minimum = "0", maximum = "9", defaultValue = "0"))
            @RequestParam(defaultValue = "0") @Min(0) @Max(FlightSearchRules.MAX_PASSENGERS) int infants) {
        return flightSearchService
                .search(new FlightSearchService.Query(from, to, date, cabin, adults, children, infants));
    }

    @Operation(operationId = "getFlight", summary = "Một chuyến bay theo id lịch bay",
            description = "Công khai. Cùng dữ liệu như một dòng của kết quả tìm; adults/children/infants (tuỳ chọn) "
                    + "dùng để tính isBookable. Lỗi: 400 như tìm chuyến bay; 404 khi id không có hoặc không đúng chiều "
                    + "from → to.")
    @GetMapping("/{scheduleId}")
    public FlightOptionResponse detail(
            @Parameter(description = "Id lịch bay", schema = @Schema(type = "integer", format = "int64"))
            @PathVariable long scheduleId,
            @Parameter(description = "Mã IATA sân bay đi", required = true, example = "SGN")
            @RequestParam @Pattern(regexp = AIRPORT_CODE, message = "Vui lòng chọn điểm đi.") String from,
            @Parameter(description = "Mã IATA sân bay đến", required = true, example = "HAN")
            @RequestParam @Pattern(regexp = AIRPORT_CODE, message = "Vui lòng chọn điểm đến.") String to,
            @Parameter(description = "Ngày bay (YYYY-MM-DD)", required = true,
                    schema = @Schema(type = "string", format = "date"))
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @Parameter(description = "Hạng ghế", schema = @Schema(implementation = CabinClass.class,
                    defaultValue = "ECONOMY"))
            @RequestParam(defaultValue = "ECONOMY") CabinClass cabin,
            @Parameter(description = "Số người lớn", schema = @Schema(type = "integer", format = "int32",
                    minimum = "1", maximum = "9", defaultValue = "1"))
            @RequestParam(defaultValue = "1") @Min(1) @Max(FlightSearchRules.MAX_PASSENGERS) int adults,
            @Parameter(description = "Số trẻ em", schema = @Schema(type = "integer", format = "int32",
                    minimum = "0", maximum = "9", defaultValue = "0"))
            @RequestParam(defaultValue = "0") @Min(0) @Max(FlightSearchRules.MAX_PASSENGERS) int children,
            @Parameter(description = "Số em bé", schema = @Schema(type = "integer", format = "int32",
                    minimum = "0", maximum = "9", defaultValue = "0"))
            @RequestParam(defaultValue = "0") @Min(0) @Max(FlightSearchRules.MAX_PASSENGERS) int infants) {
        return flightSearchService.detail(scheduleId,
                new FlightSearchService.Query(from, to, date, cabin, adults, children, infants));
    }
}
