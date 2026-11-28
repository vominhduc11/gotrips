import { queryOptions } from "@tanstack/react-query";
import type { BookingPaymentStatusView } from "@/lib/types";

/**
 * Trang chi tiết đơn hỏi lại trạng thái thanh toán khi khách đang chờ chuyển khoản: SePay báo tiền vào API qua webhook,
 * trình duyệt không tự biết. Đi qua Route Handler `/api/bookings/[code]/payment-status` vì token nằm trong cookie
 * httpOnly, chỉ server đọc được. Dùng chung cho client component và test (không import gì của server).
 */

/** Đủ nhanh để khách thấy đơn được xác nhận ngay sau khi chuyển, đủ thưa để không dồn tải lên API. */
export const PAYMENT_POLL_INTERVAL_MS = 5_000;
/** Ngừng sau khoảng 15 phút: khách để quên tab thì không hỏi mãi. Tải lại trang là hỏi tiếp. */
export const PAYMENT_POLL_LIMIT = 180;

export type PaymentSnapshot = Pick<BookingPaymentStatusView, "status" | "paymentStatus" | "receivedAmount">;

/** Lỗi HTTP của Route Handler, giữ mã để biết khi nào nên ngừng hỏi. */
export class PaymentStatusError extends Error {
  constructor(readonly status: number) {
    super(`Không đọc được trạng thái thanh toán (HTTP ${status}).`);
  }
}

export function paymentStatusPath(code: string): string {
  return `/api/bookings/${encodeURIComponent(code)}/payment-status`;
}

/** Có gì đổi so với lúc trang được dựng (đã nhận thêm tiền, đã thanh toán, đã xác nhận hoặc bị huỷ)? */
export function hasPaymentChanged(before: PaymentSnapshot, after: PaymentSnapshot): boolean {
  return (
    before.status !== after.status ||
    before.paymentStatus !== after.paymentStatus ||
    before.receivedAmount !== after.receivedAmount
  );
}

/**
 * Lần hỏi kế tiếp sau bao lâu, `false` = ngừng: đã hỏi đủ số lần, hoặc lỗi không tự hết (phiên hết hạn, đơn không còn).
 * Lỗi mạng/5xx thì hỏi tiếp, vì webhook vẫn có thể tới trong lúc API chập chờn.
 */
export function nextPollDelay(polls: number, error: unknown): number | false {
  if (polls >= PAYMENT_POLL_LIMIT) return false;
  if (error instanceof PaymentStatusError && (error.status === 401 || error.status === 404)) return false;
  return PAYMENT_POLL_INTERVAL_MS;
}

export function bookingPaymentStatusQuery(code: string) {
  return queryOptions({
    queryKey: ["booking-payment-status", code],
    queryFn: async ({ signal }): Promise<BookingPaymentStatusView> => {
      const response = await fetch(paymentStatusPath(code), { signal, cache: "no-store" });
      if (!response.ok) throw new PaymentStatusError(response.status);
      return (await response.json()) as BookingPaymentStatusView;
    },
    // Mỗi lần hỏi là một lần đọc mới; không giữ dữ liệu cũ để khách quay lại trang không thấy trạng thái cũ.
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}
