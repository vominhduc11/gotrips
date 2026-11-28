package com.gotrips.gotrips_api.booking;

/**
 * Luật tính một khoản chuyển khoản vào đơn (hàm thuần, dùng chung cho webhook SePay và cho nhân viên gắn giao dịch bằng
 * tay). Khách có thể chuyển nhiều lần: các lần chuyển được CỘNG DỒN tới khi đủ tổng tiền.
 *
 * <ul>
 *   <li>Chỉ đơn đang chờ xác nhận và chưa thanh toán mới nhận tiền. Đơn đã huỷ hoặc đã thu đủ thì không tính đồng nào
 *       (nhân viên hoàn lại cho khách).
 *   <li>Phần được tính không vượt số còn thiếu; phần thừa nằm lại ở giao dịch để nhân viên hoàn.
 *   <li>Đủ tiền khi tổng đã nhận bằng tổng tiền của đơn.
 * </ul>
 */
final class BankTransferAllocation {

    private BankTransferAllocation() {
    }

    /**
     * @param payable đơn còn nhận tiền không (đơn PENDING và khoản UNPAID)
     * @param appliedAmount phần của khoản chuyển được tính vào đơn (0..amount)
     * @param completesPayment khoản này làm đơn đủ tiền
     */
    record Result(boolean payable, long appliedAmount, boolean completesPayment) {
    }

    static Result allocate(BookingTransitions.State state, long totalAmount, long receivedAmount, long amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Số tiền chuyển khoản phải dương.");
        }
        boolean payable = state.status() == BookingStatus.PENDING && state.paymentStatus() == PaymentStatus.UNPAID;
        if (!payable) {
            return new Result(false, 0, false);
        }
        long remaining = Math.max(0, totalAmount - receivedAmount);
        long applied = Math.min(amount, remaining);
        return new Result(true, applied, receivedAmount + applied >= totalAmount);
    }
}
