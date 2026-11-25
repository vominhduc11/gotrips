import { storedBookingsSchema } from "@/lib/schemas/booking";
import type { Booking } from "@/lib/types";

/**
 * Mã hoá danh sách đơn để lưu trong MỘT cookie (bản demo, chưa có database).
 *
 * - JSON → base64url: tên tiếng Việt qua `encodeURIComponent` (cách `cookies().set` mã hoá giá trị) phình 6–9 lần
 *   ("ễ" → "%E1%BB%85"), còn base64url chỉ thêm ~1/3 và không chứa ký tự cần mã hoá.
 * - Trình duyệt chỉ nhận cookie ≤ 4096 byte (tính cả tên và thuộc tính), nên giữ giá trị dưới `BOOKINGS_COOKIE_MAX_BYTES`;
 *   vượt thì bỏ đơn CŨ NHẤT (danh sách luôn xếp mới nhất trước).
 */
export const BOOKINGS_COOKIE_MAX_BYTES = 3800;

export function encodeBookings(bookings: Booking[]): string {
  return Buffer.from(JSON.stringify(bookings), "utf8").toString("base64url");
}

/** Cookie trống, hỏng hoặc bị sửa tay sai cấu trúc → coi như chưa có đơn nào (không làm trang lỗi). */
export function decodeBookings(value: string | undefined): Booking[] {
  if (!value) return [];
  try {
    const parsed = storedBookingsSchema.safeParse(JSON.parse(Buffer.from(value, "base64url").toString("utf8")));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

/** Bỏ dần đơn cũ nhất (cuối mảng) cho tới khi chuỗi mã hoá vừa giới hạn. Trả về giá trị cookie và các đơn được giữ. */
export function fitBookingsToCookie(
  bookings: Booking[],
  maxBytes: number = BOOKINGS_COOKIE_MAX_BYTES,
): { value: string; kept: Booking[] } {
  let kept = bookings;
  let value = encodeBookings(kept);
  while (kept.length > 0 && value.length > maxBytes) {
    kept = kept.slice(0, -1);
    value = encodeBookings(kept);
  }
  return { value, kept };
}
