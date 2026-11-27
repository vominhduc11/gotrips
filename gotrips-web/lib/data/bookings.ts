import "server-only";

/**
 * Lớp truy cập dữ liệu đơn đặt chỗ (tour, khách sạn, vé máy bay) của người đang đăng nhập. Component chỉ import từ đây.
 *
 * Đơn là dữ liệu riêng từng người: gọi gotrips-api bằng token trong cookie phiên, `no-store`, KHÔNG đặt trong
 * `"use cache"`; component gọi các hàm này phải nằm trong `<Suspense>` (qua `loadSection`).
 *
 * Không bắt lỗi trừ hai kết quả hợp lệ: chưa đăng nhập / token hết hạn (401) và không có đơn (404). Lỗi khác (API sập,
 * 5xx) ném ra để nơi gọi hiện trạng thái lỗi cục bộ. KHÔNG dựa vào `getCurrentUser` để biết đã đăng nhập chưa: khi API
 * sập nó coi như khách, khách sẽ bị đẩy sang trang đăng nhập thay vì thấy thông báo lỗi.
 */
import { getMyBooking as getMyBookingApi, listMyBookings } from "@/lib/api/generated";
import { ApiError } from "@/lib/api/http";
import { bearerRequestInit } from "@/lib/auth/bearer";
import { getSessionToken } from "@/lib/auth/session";
import { isBookingCode } from "@/lib/booking/booking-code-format";
import type { BookingDetailView, BookingSummaryView } from "@/lib/types";
import { toBookingDetailView, toBookingSummaryView } from "./booking-view";

/** Kết quả đọc đơn: cần đăng nhập, hoặc có dữ liệu. */
export type OwnBookingsResult<T> = { status: "unauthenticated" } | { status: "ok"; data: T };

async function withSession<T>(load: (init: RequestInit) => Promise<T>): Promise<OwnBookingsResult<T>> {
  const token = await getSessionToken();
  if (!token) return { status: "unauthenticated" };
  try {
    return { status: "ok", data: await load(bearerRequestInit(token)) };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return { status: "unauthenticated" };
    throw error;
  }
}

/** Mọi đơn của người đang đăng nhập, mới nhất trước (API sắp sẵn). */
export function getMyBookings(): Promise<OwnBookingsResult<BookingSummaryView[]>> {
  return withSession(async (init) => {
    const { data } = await listMyBookings(init);
    return data.map(toBookingSummaryView);
  });
}

/** Chi tiết một đơn; `null` nếu không có hoặc không phải đơn của người gọi (API trả 404 như nhau). */
export function getMyBooking(code: string): Promise<OwnBookingsResult<BookingDetailView | null>> {
  return withSession(async (init) => {
    if (!isBookingCode(code)) return null;
    try {
      const { data } = await getMyBookingApi(code, init);
      return toBookingDetailView(data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  });
}
