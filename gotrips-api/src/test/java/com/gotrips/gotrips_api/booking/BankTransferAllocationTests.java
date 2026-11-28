package com.gotrips.gotrips_api.booking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** Cộng dồn các lần chuyển khoản vào khoản cần thu của đơn. */
class BankTransferAllocationTests {

    private static final BookingTransitions.State WAITING =
            new BookingTransitions.State(BookingStatus.PENDING, PaymentStatus.UNPAID);

    @Test
    void anExactTransferPaysTheBooking() {
        assertThat(BankTransferAllocation.allocate(WAITING, 1_000_000, 0, 1_000_000))
                .isEqualTo(new BankTransferAllocation.Result(true, 1_000_000, true));
    }

    @Test
    void partialTransfersAddUpAndTheLastOneCompletesThePayment() {
        assertThat(BankTransferAllocation.allocate(WAITING, 1_000_000, 0, 400_000))
                .isEqualTo(new BankTransferAllocation.Result(true, 400_000, false));
        assertThat(BankTransferAllocation.allocate(WAITING, 1_000_000, 400_000, 600_000))
                .isEqualTo(new BankTransferAllocation.Result(true, 600_000, true));
    }

    @Test
    void onlyTheMissingPartOfAnOverpaymentIsCounted() {
        assertThat(BankTransferAllocation.allocate(WAITING, 1_000_000, 400_000, 900_000))
                .isEqualTo(new BankTransferAllocation.Result(true, 600_000, true));
    }

    @ParameterizedTest
    @CsvSource({ "PENDING, PAID", "CONFIRMED, PAID", "CANCELLED, CANCELLED", "CANCELLED, PAID" })
    void bookingsThatNoLongerTakeMoneyCountNothing(BookingStatus status, PaymentStatus paymentStatus) {
        assertThat(BankTransferAllocation.allocate(new BookingTransitions.State(status, paymentStatus), 1_000_000, 0,
                1_000_000)).isEqualTo(new BankTransferAllocation.Result(false, 0, false));
    }

    @Test
    void rejectsANonPositiveAmount() {
        assertThatThrownBy(() -> BankTransferAllocation.allocate(WAITING, 1_000_000, 0, 0))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
