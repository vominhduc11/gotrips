package com.gotrips.gotrips_api.payment;

import java.util.ArrayList;
import java.util.List;

import com.gotrips.gotrips_api.booking.BookingStatus;
import com.gotrips.gotrips_api.booking.PaymentStatus;

/**
 * Luật thuần của giao dịch ngân hàng: kết quả khi gắn đơn, khi nào cần nhân viên xử lý, số tiền phải xử lý và thao tác
 * được phép. Điều kiện "cần xử lý" được viết lại bằng SQL ở {@link AdminBankTransactionPageQuery} để lọc; đổi một
 * nơi phải đổi nơi kia (test của trang quản trị canh cả hai).
 */
final class BankTransactionRules {

    private BankTransactionRules() {
    }

    enum Action {
        ASSIGN,
        RESOLVE
    }

    /** Kết quả gắn đơn: đơn không nhận tiền → NOT_PAYABLE; tính không hết số tiền → OVERPAID. */
    static BankTransactionOutcome outcome(boolean payable, long appliedAmount, long amount) {
        if (!payable) {
            return BankTransactionOutcome.NOT_PAYABLE;
        }
        return appliedAmount < amount ? BankTransactionOutcome.OVERPAID : BankTransactionOutcome.APPLIED;
    }

    /**
     * Lý do cần xử lý (chưa xét đã xử lý hay chưa). Giao dịch APPLIED của đơn đã huỷ khi chưa đủ tiền (khoản CANCELLED)
     * cũng cần hoàn. Đơn huỷ SAU khi đã thu đủ (khoản giữ PAID) thì việc hoàn nằm ở danh sách đơn "Cần hoàn tiền", không
     * lặp lại ở đây.
     */
    static BankTransactionReviewReason reviewReason(BankTransactionOutcome outcome, BookingStatus bookingStatus,
            PaymentStatus paymentStatus) {
        return switch (outcome) {
            case UNMATCHED -> BankTransactionReviewReason.UNMATCHED;
            case WRONG_ACCOUNT -> BankTransactionReviewReason.WRONG_ACCOUNT;
            case NOT_PAYABLE -> BankTransactionReviewReason.NOT_PAYABLE;
            case OVERPAID -> BankTransactionReviewReason.OVERPAID;
            case APPLIED -> bookingStatus == BookingStatus.CANCELLED && paymentStatus == PaymentStatus.CANCELLED
                    ? BankTransactionReviewReason.BOOKING_CANCELLED
                    : BankTransactionReviewReason.NONE;
        };
    }

    /** Số tiền nhân viên phải xử lý (hoàn hoặc gắn đơn). */
    static long reviewAmount(BankTransactionReviewReason reason, long amount, long appliedAmount) {
        return switch (reason) {
            case NONE -> 0;
            case OVERPAID -> amount - appliedAmount;
            case BOOKING_CANCELLED -> appliedAmount;
            case UNMATCHED, WRONG_ACCOUNT, NOT_PAYABLE -> amount;
        };
    }

    static boolean needsReview(BankTransactionReviewReason reason, boolean resolved) {
        return reason != BankTransactionReviewReason.NONE && !resolved;
    }

    /** Gắn đơn: chỉ giao dịch chưa có đơn và chưa được đánh dấu xử lý. Đánh dấu xử lý: khi đang cần xử lý. */
    static List<Action> availableActions(boolean hasBooking, BankTransactionReviewReason reason, boolean resolved) {
        List<Action> actions = new ArrayList<>(2);
        if (!hasBooking && !resolved) {
            actions.add(Action.ASSIGN);
        }
        if (needsReview(reason, resolved)) {
            actions.add(Action.RESOLVE);
        }
        return List.copyOf(actions);
    }
}
