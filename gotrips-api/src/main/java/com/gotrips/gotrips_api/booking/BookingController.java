package com.gotrips.gotrips_api.booking;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.gotrips.gotrips_api.common.security.JwtUserId;
import com.gotrips.gotrips_api.config.OpenApiConfig;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Đơn đặt chỗ của người đang đăng nhập. Chủ đơn xác định theo {@code sub} của JWT. Lỗi trả theo {@code ProblemDetail};
 * spec chỉ khai kết quả thành công để client do Orval sinh có kiểu gọn.
 */
@RestController
@RequestMapping("/bookings")
@RequiredArgsConstructor
@Tag(name = "Đơn đặt chỗ", description = "Đặt tour, phòng khách sạn, vé máy bay và xem đơn của tôi")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class BookingController {

    private final TourBookingService tourBookingService;
    private final HotelBookingService hotelBookingService;
    private final FlightBookingService flightBookingService;
    private final BookingQueryService bookingQueryService;

    @Operation(operationId = "createTourBooking", summary = "Đặt tour",
            description = "Giá do API tính và chốt vào đơn. Lỗi: 400 dữ liệu không hợp lệ (chuyến không tồn tại/tour "
                    + "ẩn, chuyến đã đóng đặt chỗ, số người đi khác số khách), 401, 409 chuyến không còn đủ chỗ; "
                    + "kèm errors[{field,message}].")
    @PostMapping("/tours")
    @ResponseStatus(HttpStatus.CREATED)
    public BookingDetailResponse createTour(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateTourBookingRequest request) {
        return tourBookingService.create(JwtUserId.from(jwt), request);
    }

    @Operation(operationId = "createHotelBooking", summary = "Đặt phòng khách sạn",
            description = "Nhận phòng từ ngày mai. Lỗi: 400 dữ liệu không hợp lệ (loại phòng/khách sạn không nhận đặt, "
                    + "ngày sai, quá sức chứa), 401, 409 không còn đủ phòng trống; kèm errors[{field,message}].")
    @PostMapping("/hotels")
    @ResponseStatus(HttpStatus.CREATED)
    public BookingDetailResponse createHotel(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateHotelBookingRequest request) {
        return hotelBookingService.create(JwtUserId.from(jwt), request);
    }

    @Operation(operationId = "createFlightBooking", summary = "Đặt vé máy bay (một chiều hoặc khứ hồi)",
            description = "Bay từ ngày mai. Lỗi: 400 dữ liệu không hợp lệ (chuyến sai chiều, số hành khách/tuổi sai), "
                    + "401, 409 chuyến không còn đủ ghế; kèm errors[{field,message}].")
    @PostMapping("/flights")
    @ResponseStatus(HttpStatus.CREATED)
    public BookingDetailResponse createFlight(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateFlightBookingRequest request) {
        return flightBookingService.create(JwtUserId.from(jwt), request);
    }

    @Operation(operationId = "listMyBookings", summary = "Đơn của tôi, mới nhất trước", description = "Lỗi: 401.")
    @GetMapping("/me")
    public List<BookingSummaryResponse> mine(@AuthenticationPrincipal Jwt jwt) {
        return bookingQueryService.listMine(JwtUserId.from(jwt));
    }

    @Operation(operationId = "getMyBooking", summary = "Chi tiết một đơn của tôi",
            description = "Kèm thông tin chuyển khoản. Lỗi: 401; 404 khi mã không có hoặc không phải đơn của người gọi.")
    @GetMapping("/{code}")
    public BookingDetailResponse detail(@AuthenticationPrincipal Jwt jwt,
            @Parameter(description = "Mã đơn, ví dụ GT7K4Q2M") @PathVariable String code) {
        return bookingQueryService.getMine(JwtUserId.from(jwt), code);
    }
}
