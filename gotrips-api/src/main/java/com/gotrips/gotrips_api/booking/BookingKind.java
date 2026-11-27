package com.gotrips.gotrips_api.booking;

import io.swagger.v3.oas.annotations.media.Schema;

/** Loại dịch vụ của đơn. Mã đơn, trạng thái, thanh toán dùng chung; phần chi tiết khác nhau theo loại. */
@Schema(enumAsRef = true, description = "Loại dịch vụ của đơn")
public enum BookingKind {
    TOUR,
    HOTEL,
    FLIGHT
}
