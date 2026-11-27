package com.gotrips.gotrips_api.booking;

import org.springdoc.core.annotations.ParameterObject;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gotrips.gotrips_api.config.OpenApiConfig;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/** Tra cứu và thao tác đơn của nhân viên (chỉ STAFF/ADMIN). */
@RestController
@RequestMapping("/admin/bookings")
@RequiredArgsConstructor
@Tag(name = "Quản trị đơn", description = "Thao tác của nhân viên trên đơn đặt chỗ")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
@SecurityRequirement(name = OpenApiConfig.ADMIN_COOKIE_SCHEME)
public class AdminBookingController {

    private static final String ERRORS = "Lỗi: 401, 403 không phải STAFF/ADMIN, 404 không có đơn, ";

    private final BookingAdminService bookingAdminService;

    @Operation(operationId = "listAdminBookings", summary = "Tìm và phân trang đơn đặt chỗ",
            description = "Lỗi: 400 bộ lọc không hợp lệ, 401 chưa đăng nhập, 403 thiếu quyền.")
    @GetMapping
    public AdminBookingPageResponse list(@Valid @ParameterObject @ModelAttribute AdminBookingFilters filters) {
        return bookingAdminService.list(filters);
    }

    @Operation(operationId = "getAdminBooking", summary = "Chi tiết đơn dành cho nhân viên",
            description = "Lỗi: 401 chưa đăng nhập, 403 thiếu quyền, 404 không tìm thấy đơn.")
    @GetMapping("/{code}")
    public AdminBookingDetailResponse get(@PathVariable String code) {
        return bookingAdminService.get(code);
    }

    @Operation(operationId = "markBookingPaid", summary = "Đánh dấu đã nhận tiền",
            description = ERRORS + "409 đơn không ở trạng thái chờ xác nhận + chưa thanh toán.")
    @PostMapping("/{code}/mark-paid")
    public AdminBookingDetailResponse markPaid(@PathVariable String code) {
        return bookingAdminService.apply(code, BookingTransitions.Action.MARK_PAID);
    }

    @Operation(operationId = "confirmBooking", summary = "Xác nhận đơn",
            description = ERRORS + "409 đơn không ở trạng thái chờ xác nhận + đã thanh toán.")
    @PostMapping("/{code}/confirm")
    public AdminBookingDetailResponse confirm(@PathVariable String code) {
        return bookingAdminService.apply(code, BookingTransitions.Action.CONFIRM);
    }

    @Operation(operationId = "cancelBooking", summary = "Huỷ đơn (trả lại chỗ/phòng/ghế)",
            description = ERRORS + "409 đơn đã huỷ.")
    @PostMapping("/{code}/cancel")
    public AdminBookingDetailResponse cancel(@PathVariable String code) {
        return bookingAdminService.apply(code, BookingTransitions.Action.CANCEL);
    }
}
