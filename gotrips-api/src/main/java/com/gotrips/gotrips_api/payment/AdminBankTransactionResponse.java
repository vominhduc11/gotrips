package com.gotrips.gotrips_api.payment;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Giao dịch tiền vào tài khoản nhận, do SePay báo")
public record AdminBankTransactionResponse(
        @Schema(requiredMode = REQUIRED) long id,
        @Schema(requiredMode = REQUIRED, description = "id giao dịch trên SePay") long sepayId,
        @Schema(requiredMode = REQUIRED, example = "Vietcombank") String gateway,
        @Schema(requiredMode = REQUIRED) String accountNumber,
        @Schema(requiredMode = REQUIRED, description = "Số tiền chuyển (VND)") long amount,
        @Schema(requiredMode = REQUIRED, description = "Phần đã tính vào đơn (VND)") long appliedAmount,
        @Schema(requiredMode = REQUIRED, description = "Nội dung chuyển khoản nguyên văn") String content,
        @Schema(requiredMode = REQUIRED, nullable = true) String referenceCode,
        @Schema(requiredMode = REQUIRED, description = "Thời điểm ngân hàng ghi nhận") Instant transactionAt,
        @Schema(requiredMode = REQUIRED, description = "Thời điểm GoTrips nhận webhook") Instant receivedAt,
        @Schema(requiredMode = REQUIRED) BankTransactionOutcome outcome,
        @Schema(requiredMode = REQUIRED, nullable = true, example = "GT7K4Q2M") String bookingCode,
        @Schema(requiredMode = REQUIRED) BankTransactionReviewReason reviewReason,
        @Schema(requiredMode = REQUIRED, description = "Số tiền nhân viên cần hoàn hoặc gắn đơn (VND)") long reviewAmount,
        @Schema(requiredMode = REQUIRED, description = "Có lý do cần xử lý và chưa được đánh dấu xử lý")
        boolean needsReview,
        @Schema(requiredMode = REQUIRED) List<BankTransactionRules.Action> availableActions,
        @Schema(requiredMode = REQUIRED, nullable = true, description = "Lúc nhân viên gắn tay; null = tự gắn")
        Instant assignedAt,
        @Schema(requiredMode = REQUIRED, nullable = true) String assignedByName,
        @Schema(requiredMode = REQUIRED, nullable = true) Instant resolvedAt,
        @Schema(requiredMode = REQUIRED, nullable = true) String resolvedByName,
        @Schema(requiredMode = REQUIRED, nullable = true) String resolutionNote) {
}
