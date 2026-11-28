package com.gotrips.gotrips_api.payment;

import io.swagger.v3.oas.annotations.media.Schema;

/** Kết quả đối chiếu một giao dịch tiền vào với đơn đặt chỗ, chốt lúc gắn đơn. */
@Schema(enumAsRef = true, description = "Kết quả đối chiếu giao dịch với đơn")
public enum BankTransactionOutcome {
    /** Toàn bộ số tiền đã tính vào đơn đang chờ thanh toán. */
    APPLIED,
    /** Đã tính vào đơn và làm đơn đủ tiền, nhưng khách chuyển thừa: phần thừa cần hoàn. */
    OVERPAID,
    /** Tìm thấy đơn nhưng đơn đã huỷ hoặc đã thu đủ trước đó: không tính đồng nào, cần hoàn. */
    NOT_PAYABLE,
    /** Nội dung không có mã của đơn nào: nhân viên gắn tay hoặc hoàn. */
    UNMATCHED,
    /** Tiền vào tài khoản khác tài khoản nhận đã cấu hình: không tự tính vào đơn. */
    WRONG_ACCOUNT
}
