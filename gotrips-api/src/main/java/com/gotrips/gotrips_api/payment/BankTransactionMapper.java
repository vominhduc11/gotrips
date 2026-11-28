package com.gotrips.gotrips_api.payment;

import java.util.List;

import org.mapstruct.Mapper;

import com.gotrips.gotrips_api.config.MapStructConfig;

/** Các trường còn lại lấy từ giao dịch theo tên; phần suy ra (lý do, số tiền cần xử lý, thao tác) truyền riêng. */
@Mapper(config = MapStructConfig.class)
interface BankTransactionMapper {

    AdminBankTransactionResponse toAdmin(BankTransaction transaction, String bookingCode,
            BankTransactionReviewReason reviewReason, long reviewAmount, boolean needsReview,
            List<BankTransactionRules.Action> availableActions, String assignedByName, String resolvedByName);
}
