package com.gotrips.gotrips_api.booking;

import io.swagger.v3.oas.annotations.media.Schema;

/** Trạng thái đơn. Trạng thái thanh toán lưu RIÊNG ({@link PaymentStatus}), không gộp vào đây. */
@Schema(enumAsRef = true, description = "Trạng thái đơn")
public enum BookingStatus {
    PENDING,
    CONFIRMED,
    CANCELLED
}
