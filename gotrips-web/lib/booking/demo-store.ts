import "server-only";

import { cookies } from "next/headers";
import type { Booking } from "@/lib/types";
import { generateBookingCode } from "./booking-code";
import { decodeBookings, fitBookingsToCookie } from "./cookie-codec";

/**
 * PROTOTYPE: "kho" đơn đặt chỗ (tour, khách sạn, vé máy bay) của bản demo là một cookie httpOnly trên trình duyệt của khách (chưa có database).
 * Hệ quả cần biết khi demo: mỗi trình duyệt chỉ thấy đơn tạo trên chính nó, chỉ giữ vài đơn gần nhất (giới hạn 4KB),
 * cookie không ký nên chỉ dùng cho dữ liệu thử nghiệm, và số chỗ/số phòng/số ghế (mock) không giảm.
 *
 * Khi gotrips-api có endpoint booking: xoá file này cùng `cookie-codec.ts`; `lib/data/bookings.ts` và
 * `lib/actions/booking.ts` gọi API thay cho hai hàm dưới đây.
 */
export const BOOKINGS_COOKIE = "gotrips_bookings";
const BOOKINGS_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** Mọi đơn trong cookie (của mọi tài khoản từng đăng nhập trên trình duyệt này), mới nhất trước. */
export async function readStoredBookings(): Promise<Booking[]> {
  const cookieStore = await cookies();
  return decodeBookings(cookieStore.get(BOOKINGS_COOKIE)?.value);
}

/** Ghi đè cả danh sách (mới nhất trước). Chỉ gọi được trong Server Action / Route Handler. */
export async function writeStoredBookings(bookings: Booking[]): Promise<void> {
  const { value } = fitBookingsToCookie(bookings);
  const cookieStore = await cookies();
  cookieStore.set(BOOKINGS_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: BOOKINGS_MAX_AGE_SECONDS,
    // Chưa bật `secure`: bản Docker chạy HTTP (giống cookie phiên).
  });
}

/**
 * Thêm một đơn mới lên đầu danh sách: sinh mã không trùng với các đơn đang có, dựng bản ghi bằng `build(code)` rồi ghi
 * cookie. Trả về đơn vừa lưu. Chỉ gọi được trong Server Action.
 */
export async function addStoredBooking<T extends Booking>(build: (code: string) => T): Promise<T> {
  const existing = await readStoredBookings();
  const usedCodes = new Set(existing.map((b) => b.code));
  let code = generateBookingCode();
  while (usedCodes.has(code)) code = generateBookingCode();

  const booking = build(code);
  await writeStoredBookings([booking, ...existing]);
  return booking;
}
