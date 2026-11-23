import { differenceInCalendarDays, format, isValid, parseISO } from "date-fns";

/**
 * Tiện ích cho ngày dạng chuỗi `YYYY-MM-DD` (kiểu DATE, không múi giờ) — dùng chung cho schema và bộ chọn ngày.
 * Mọi phép tính đi qua date-fns trên ngày LỊCH (`differenceInCalendarDays`) nên không bị lệch vì giờ/múi giờ.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Đúng định dạng `YYYY-MM-DD` và là ngày có thật ("2027-02-30" → false). */
export function isIsoDate(value: string): boolean {
  return ISO_DATE.test(value) && isValid(parseISO(value));
}

/** Số ngày lịch `a - b` (âm nếu `a` trước `b`). Chỉ gọi khi cả hai đã qua `isIsoDate`. */
export function diffInDays(a: string, b: string): number {
  return differenceInCalendarDays(parseISO(a), parseISO(b));
}

/** `Date` (giờ địa phương của bộ chọn ngày) → `YYYY-MM-DD`. Dùng giờ địa phương để ngày khách bấm không bị lệch. */
export function toIsoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** `YYYY-MM-DD` → `Date` lúc 00:00 giờ địa phương; chuỗi trống/không hợp lệ → `undefined`. */
export function fromIsoDate(value: string): Date | undefined {
  return isIsoDate(value) ? parseISO(value) : undefined;
}
