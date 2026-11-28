package com.gotrips.gotrips_api.payment;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

/**
 * @param needsReview {@code true}: chỉ giao dịch đang cần xử lý; {@code false}: chỉ giao dịch không cần (hoặc đã xử
 *     lý); bỏ trống: tất cả
 * @param q tìm trong nội dung chuyển khoản, mã tham chiếu ngân hàng và mã đơn
 * @param bookingCode chỉ giao dịch của đúng đơn này
 */
public record AdminBankTransactionFilters(
        Boolean needsReview,
        BankTransactionOutcome outcome,
        @Size(max = 100) String q,
        @Size(max = 20) String bookingCode,
        @Min(1) @Schema(type = "integer", defaultValue = "1") Integer page,
        @Min(1) @Max(100) @Schema(type = "integer", defaultValue = "20") Integer size) {

    int pageNumber() {
        return page == null ? 1 : page;
    }

    int pageSize() {
        return size == null ? 20 : size;
    }
}
