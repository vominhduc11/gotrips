package com.gotrips.gotrips_api.booking;

import java.util.Arrays;
import java.util.List;

import com.gotrips.gotrips_api.common.error.ConflictException;

/**
 * Luật chuyển trạng thái đơn khi nhân viên thao tác (giống nhau cho tour, khách sạn, vé máy bay): hàm thuần, theo luồng
 * MVP "nhân viên kiểm tra thanh toán rồi xác nhận".
 *
 * <ul>
 *   <li>mark-paid: đơn PENDING + chưa thanh toán → thanh toán PAID.
 *   <li>confirm: đơn PENDING + đã thanh toán → CONFIRMED. Chưa thu tiền thì không xác nhận.
 *   <li>cancel: đơn PENDING hoặc CONFIRMED → CANCELLED. Khoản chưa thu thì huỷ theo; khoản đã thu giữ nguyên PAID để
 *       nhân viên biết phải hoàn tiền (MVP chưa có trạng thái hoàn tiền).
 * </ul>
 */
public final class BookingTransitions {

    private BookingTransitions() {
    }

    public enum Action {
        MARK_PAID,
        CONFIRM,
        CANCEL
    }

    /** Trạng thái đơn và trạng thái thanh toán (lưu riêng). */
    public record State(BookingStatus status, PaymentStatus paymentStatus) {
    }

    public static boolean canApply(State state, Action action) {
        return switch (action) {
            case MARK_PAID -> state.status() == BookingStatus.PENDING && state.paymentStatus() == PaymentStatus.UNPAID;
            case CONFIRM -> state.status() == BookingStatus.PENDING && state.paymentStatus() == PaymentStatus.PAID;
            case CANCEL -> state.status() != BookingStatus.CANCELLED;
        };
    }

    public static List<Action> availableActions(State state) {
        return Arrays.stream(Action.values()).filter(action -> canApply(state, action)).toList();
    }

    /** Trạng thái sau thao tác; trạng thái hiện tại không cho phép thì ném {@link ConflictException} (409). */
    public static State apply(State state, Action action) {
        if (!canApply(state, action)) {
            throw new ConflictException(rejectedMessage(action));
        }
        return switch (action) {
            case MARK_PAID -> new State(state.status(), PaymentStatus.PAID);
            case CONFIRM -> new State(BookingStatus.CONFIRMED, state.paymentStatus());
            case CANCEL -> new State(BookingStatus.CANCELLED,
                    state.paymentStatus() == PaymentStatus.UNPAID ? PaymentStatus.CANCELLED : state.paymentStatus());
        };
    }

    private static String rejectedMessage(Action action) {
        return switch (action) {
            case MARK_PAID -> "Chỉ đánh dấu đã thanh toán được cho đơn đang chờ xác nhận và chưa thanh toán.";
            case CONFIRM -> "Chỉ xác nhận được đơn đang chờ xác nhận và đã thanh toán.";
            case CANCEL -> "Đơn này đã huỷ trước đó.";
        };
    }
}
