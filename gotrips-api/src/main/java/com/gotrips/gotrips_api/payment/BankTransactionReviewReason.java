package com.gotrips.gotrips_api.payment;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Vì sao giao dịch cần nhân viên xử lý. Không dùng {@code null} cho "không cần": springdoc sinh sai kiểu cho thuộc tính
 * enum ({@code $ref}) có {@code nullable}.
 */
@Schema(enumAsRef = true, description = "Lý do giao dịch cần nhân viên xử lý")
public enum BankTransactionReviewReason {
    /** Không có gì phải xử lý. */
    NONE,
    UNMATCHED,
    WRONG_ACCOUNT,
    NOT_PAYABLE,
    OVERPAID,
    /** Tiền đã tính vào đơn, nhưng đơn bị huỷ khi chưa đủ tiền: khoản đã nhận cần hoàn. */
    BOOKING_CANCELLED
}
