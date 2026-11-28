package com.gotrips.gotrips_api.payment;

import static com.gotrips.gotrips_api.payment.BankTransactionRules.Action.ASSIGN;
import static com.gotrips.gotrips_api.payment.BankTransactionRules.Action.RESOLVE;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import com.gotrips.gotrips_api.booking.BookingStatus;
import com.gotrips.gotrips_api.booking.PaymentStatus;
import com.gotrips.gotrips_api.common.error.ResourceNotFoundException;
import com.gotrips.gotrips_api.config.SepayProperties;

/** Kết quả gắn đơn, lý do cần xử lý, số tiền cần xử lý và thao tác được phép của một giao dịch. */
class BankTransactionRulesTests {

    @ParameterizedTest
    @CsvSource({ "true, 1000, 1000, APPLIED", "true, 600, 1000, OVERPAID", "false, 0, 1000, NOT_PAYABLE" })
    void outcomeFollowsWhatTheBookingAccepted(boolean payable, long applied, long amount,
            BankTransactionOutcome expected) {
        assertThat(BankTransactionRules.outcome(payable, applied, amount)).isEqualTo(expected);
    }

    @ParameterizedTest
    @CsvSource({
            "UNMATCHED,     ,          ,          UNMATCHED",
            "WRONG_ACCOUNT, ,          ,          WRONG_ACCOUNT",
            "NOT_PAYABLE,   CANCELLED, CANCELLED, NOT_PAYABLE",
            "OVERPAID,      CONFIRMED, PAID,      OVERPAID",
            "APPLIED,       PENDING,   UNPAID,    NONE",
            "APPLIED,       CONFIRMED, PAID,      NONE",
            // Huỷ sau khi đã thu đủ: việc hoàn tiền thuộc danh sách đơn "Cần hoàn tiền", không lặp ở giao dịch.
            "APPLIED,       CANCELLED, PAID,      NONE",
            // Huỷ khi mới nhận một phần: khoản CANCELLED, tiền đã nhận phải hoàn.
            "APPLIED,       CANCELLED, CANCELLED, BOOKING_CANCELLED" })
    void reviewReason(BankTransactionOutcome outcome, BookingStatus bookingStatus, PaymentStatus paymentStatus,
            BankTransactionReviewReason expected) {
        assertThat(BankTransactionRules.reviewReason(outcome, bookingStatus, paymentStatus)).isEqualTo(expected);
    }

    @ParameterizedTest
    @CsvSource({ "NONE, 1000, 1000, 0", "OVERPAID, 1000, 600, 400", "BOOKING_CANCELLED, 600, 600, 600",
            "UNMATCHED, 1000, 0, 1000", "WRONG_ACCOUNT, 1000, 0, 1000", "NOT_PAYABLE, 1000, 0, 1000" })
    void reviewAmountIsTheMoneyStaffMustReturnOrAssign(BankTransactionReviewReason reason, long amount, long applied,
            long expected) {
        assertThat(BankTransactionRules.reviewAmount(reason, amount, applied)).isEqualTo(expected);
    }

    @Test
    void actionsDependOnTheBookingReasonAndResolution() {
        assertThat(BankTransactionRules.availableActions(false, BankTransactionReviewReason.UNMATCHED, false))
                .containsExactly(ASSIGN, RESOLVE);
        assertThat(BankTransactionRules.availableActions(false, BankTransactionReviewReason.UNMATCHED, true)).isEmpty();
        assertThat(BankTransactionRules.availableActions(true, BankTransactionReviewReason.OVERPAID, false))
                .containsExactly(RESOLVE);
        assertThat(BankTransactionRules.availableActions(true, BankTransactionReviewReason.NONE, false)).isEmpty();
        assertThat(BankTransactionRules.needsReview(BankTransactionReviewReason.NONE, false)).isFalse();
        assertThat(BankTransactionRules.needsReview(BankTransactionReviewReason.OVERPAID, true)).isFalse();
    }

    @Test
    void theWebhookIsOffWithoutASecret() {
        // Không cần DB: tắt thì dừng trước mọi bước khác (parse, ghi giao dịch).
        var service = new SepayWebhookService(new SepayProperties(" "), null, null, null,
                Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));
        assertThatThrownBy(() -> service.receive(new byte[0], null, null))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
