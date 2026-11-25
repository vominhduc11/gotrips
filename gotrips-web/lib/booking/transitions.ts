import type { Booking, BookingStatus, PaymentStatus } from "@/lib/types";

/**
 * Các thao tác của nhân viên trên một đơn (mọi loại dịch vụ). Ở bản demo chúng được gọi từ khối "Mô phỏng nhân viên" trên trang chi tiết
 * đơn; khi có gotrips-admin thì cùng luật này nằm ở backend.
 */
export const BOOKING_ACTIONS = ["mark-paid", "confirm", "cancel"] as const;
export type BookingAction = (typeof BOOKING_ACTIONS)[number];

export type BookingActionOutcome<T extends Booking = Booking> = { ok: true; booking: T } | { ok: false; message: string };

/**
 * Luật chuyển trạng thái (đúng luồng MVP "nhân viên kiểm tra thanh toán rồi xác nhận"):
 *  - mark-paid: đơn PENDING + chưa thanh toán → thanh toán PAID.
 *  - confirm  : đơn PENDING + đã thanh toán → CONFIRMED. Chưa thu tiền thì không xác nhận.
 *  - cancel   : đơn PENDING hoặc CONFIRMED → CANCELLED. Khoản chưa thu thì huỷ theo; khoản đã thu giữ nguyên PAID
 *               để nhân viên biết phải hoàn tiền (chưa có trạng thái hoàn tiền trong MVP).
 */
export interface BookingState {
  status: BookingStatus;
  paymentStatus: PaymentStatus;
}

function canApply(state: BookingState, action: BookingAction): boolean {
  switch (action) {
    case "mark-paid":
      return state.status === "PENDING" && state.paymentStatus === "UNPAID";
    case "confirm":
      return state.status === "PENDING" && state.paymentStatus === "PAID";
    case "cancel":
      return state.status === "PENDING" || state.status === "CONFIRMED";
  }
}

const stateOf = (booking: Booking): BookingState => ({ status: booking.status, paymentStatus: booking.payment.status });

const REJECTED_MESSAGE: Record<BookingAction, string> = {
  "mark-paid": "Chỉ đánh dấu đã thanh toán được cho đơn đang chờ xác nhận và chưa thanh toán.",
  confirm: "Chỉ xác nhận được đơn đang chờ xác nhận và đã thanh toán.",
  cancel: "Đơn này đã huỷ trước đó.",
};

/** Các thao tác hợp lệ với trạng thái hiện tại của đơn (giao diện dùng để khoá nút). */
export function getAvailableActions(state: BookingState): BookingAction[] {
  return BOOKING_ACTIONS.filter((action) => canApply(state, action));
}

/**
 * Áp một thao tác, trả về bản ghi MỚI (không sửa bản cũ). Luật giống nhau cho đơn tour, khách sạn, vé máy bay (chỉ
 * đụng tới trạng thái và thanh toán). `nowIso` truyền vào để test không phụ thuộc đồng hồ.
 */
export function applyBookingAction<T extends Booking>(
  booking: T,
  action: BookingAction,
  nowIso: string,
): BookingActionOutcome<T> {
  if (!canApply(stateOf(booking), action)) return { ok: false, message: REJECTED_MESSAGE[action] };

  switch (action) {
    case "mark-paid":
      return { ok: true, booking: { ...booking, payment: { ...booking.payment, status: "PAID", paidAt: nowIso } } };
    case "confirm":
      return { ok: true, booking: { ...booking, status: "CONFIRMED", confirmedAt: nowIso } };
    case "cancel":
      return {
        ok: true,
        booking: {
          ...booking,
          status: "CANCELLED",
          cancelledAt: nowIso,
          payment:
            booking.payment.status === "UNPAID" ? { ...booking.payment, status: "CANCELLED" } : booking.payment,
        },
      };
  }
}
