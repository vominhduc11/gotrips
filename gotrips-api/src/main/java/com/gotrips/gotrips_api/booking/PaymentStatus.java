package com.gotrips.gotrips_api.booking;

import io.swagger.v3.oas.annotations.media.Schema;

/** Trạng thái thanh toán. {@code CANCELLED}: đơn bị huỷ khi chưa trả tiền nên khoản cần thu không còn. */
@Schema(enumAsRef = true, description = "Trạng thái thanh toán")
public enum PaymentStatus {
    UNPAID,
    PAID,
    CANCELLED
}
