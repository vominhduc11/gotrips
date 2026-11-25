"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { addStoredBooking, readStoredBookings, writeStoredBookings } from "@/lib/booking/demo-store";
import { applyBookingAction } from "@/lib/booking/transitions";
import { computeBookingTotal } from "@/lib/data/booking-view";
import { getDepartureForBooking } from "@/lib/data/bookings";
import { getTodayInVietnam } from "@/lib/data/tour-view";
import { buildLoginHref } from "@/lib/safe-redirect";
import {
  buildBookingHref,
  createBookingRequestSchema,
  DEFAULT_BOOKING_STEP,
  simulateBookingSchema,
  startBookingRequestSchema,
} from "@/lib/schemas/booking";
import type { TourBooking } from "@/lib/types";
import { simulateLatency } from "./demo-latency";
import { toFieldErrors } from "./field-errors";

// Server Action của đơn tour + thao tác "mô phỏng nhân viên" dùng chung cho mọi loại đơn. Đơn khách sạn: hotel-booking.ts;
// vé máy bay: flight-booking.ts.
// PROTOTYPE: chưa có gotrips-api — đơn được lưu vào cookie của trình duyệt (lib/booking/demo-store.ts), số chỗ của tour
// (mock) KHÔNG bị trừ. Khi có API: thay thân hàm bằng `POST /bookings` (backend giữ chỗ trong transaction, tự tính giá)
// và các endpoint của nhân viên; giữ nguyên chữ ký và kiểu kết quả để form không phải sửa.

export type BookingActionResult =
  | { ok: true; code: string; redirectTo: string }
  | { ok: false; message?: string; fieldErrors?: Record<string, string> };

export type SimulateBookingResult = { ok: true; message: string } | { ok: false; message: string };

const SESSION_EXPIRED = "Phiên đăng nhập đã hết hạn. Bạn vui lòng đăng nhập lại để tiếp tục.";

/**
 * Nút "Đặt tour" ở trang chi tiết: kiểm tra phiên rồi chuyển thẳng tới trang đặt tour, hoặc tới đăng nhập (kèm `next`)
 * nếu chưa đăng nhập. Thẻ "Đặt tour" thuộc phần tĩnh của trang nên không tự biết phiên.
 *
 * Vì sao không cứ mở `/book` rồi để trang đó chuyển sang đăng nhập: khi điều hướng phía client, Next GIỮ cây `/book` vừa
 * ghé (ẩn bằng `<Activity>`, do `cacheComponents`), kể cả lệnh chuyển hướng đang nằm trong đó; đăng nhập xong quay lại
 * `/book` thì lệnh cũ chạy lại và khách bị đẩy về trang đăng nhập lần nữa. Chuyển hướng ngay trong action thì trình duyệt
 * không bao giờ ghé `/book` khi chưa đăng nhập. (Mở thẳng `/book` bằng URL vẫn do `BookingGate` xử lý, không bị lỗi này.)
 */
export async function startBookingAction(values: unknown): Promise<{ ok: false; message: string }> {
  const parsed = startBookingRequestSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: "Lựa chọn chuyến chưa hợp lệ. Bạn vui lòng chọn lại." };

  const { tourSlug, departureId, guests } = parsed.data;
  const bookingHref = buildBookingHref(tourSlug, { departure: departureId, guests, step: DEFAULT_BOOKING_STEP });
  const user = await getCurrentUser();
  redirect(user ? bookingHref : buildLoginHref(bookingHref));
}

/**
 * Tạo đơn đặt tour. Server Action là endpoint công khai: kiểm tra đăng nhập, kiểm lại schema và TỰ TÍNH GIÁ từ lịch
 * khởi hành — dữ liệu gửi lên không có trường giá nào, nên khách không sửa được tiền phải trả.
 */
export async function createBookingAction(values: unknown): Promise<BookingActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };

  const today = getTodayInVietnam();
  const parsed = createBookingRequestSchema(today).safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Thông tin đặt tour chưa hợp lệ. Bạn vui lòng kiểm tra lại các ô được đánh dấu.",
      fieldErrors: toFieldErrors(parsed.error.issues),
    };
  }

  await simulateLatency();

  const request = parsed.data;
  const found = await getDepartureForBooking(request.tourSlug, request.departureId);
  if (!found) {
    return { ok: false, fieldErrors: { departureId: "Chuyến khởi hành này không còn tồn tại. Bạn vui lòng chọn ngày khác." } };
  }
  // So sánh chuỗi `YYYY-MM-DD` là đúng thứ tự thời gian. Chuyến khởi hành hôm nay coi như đã đóng đặt chỗ.
  if (found.departure.departureDate <= today) {
    return { ok: false, fieldErrors: { departureId: "Chuyến này đã đóng đặt chỗ. Bạn vui lòng chọn ngày khác." } };
  }
  if (found.seatsLeft < request.guests) {
    return {
      ok: false,
      fieldErrors: {
        guests:
          found.seatsLeft > 0
            ? `Chuyến này chỉ còn ${found.seatsLeft} chỗ. Bạn vui lòng giảm số khách hoặc chọn ngày khác.`
            : "Chuyến này đã hết chỗ. Bạn vui lòng chọn ngày khác.",
      },
    };
  }

  const unitPrice = found.departure.price;
  const totalAmount = computeBookingTotal(unitPrice, request.guests);
  const booking = await addStoredBooking<TourBooking>((code) => ({
    kind: "tour",
    code,
    ownerEmail: user.email,
    departureId: found.departure.id,
    guestCount: request.guests,
    unitPrice,
    totalAmount,
    contact: request.contact,
    travelers: request.travelers.map((t) => ({ fullName: t.fullName, dateOfBirth: t.dateOfBirth || null })),
    note: request.note || null,
    status: "PENDING",
    payment: { method: "BANK_TRANSFER", amount: totalAmount, status: "UNPAID", paidAt: null },
    createdAt: new Date().toISOString(),
    confirmedAt: null,
    cancelledAt: null,
  }));

  return { ok: true, code: booking.code, redirectTo: `/bookings/${booking.code}` };
}

const SIMULATE_SUCCESS = {
  "mark-paid": "Đã đánh dấu đơn đã thanh toán.",
  confirm: "Đã xác nhận đơn.",
  cancel: "Đã huỷ đơn.",
} as const;

/**
 * BẢN THỬ NGHIỆM: thao tác của nhân viên (đánh dấu đã thanh toán, xác nhận, huỷ) trên đơn bất kỳ loại nào, để demo đủ trạng thái khi chưa có
 * trang quản trị. Chỉ chủ đơn thao tác được trên đơn của mình. Xoá cùng `BookingSimulator` khi có gotrips-admin.
 */
export async function simulateBookingAction(code: unknown, action: unknown): Promise<SimulateBookingResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };

  const parsed = simulateBookingSchema.safeParse({ code, action });
  if (!parsed.success) return { ok: false, message: "Thao tác không hợp lệ." };

  const bookings = await readStoredBookings();
  const email = user.email.toLowerCase();
  const index = bookings.findIndex((b) => b.code === parsed.data.code && b.ownerEmail.toLowerCase() === email);
  const current = bookings[index];
  if (!current) return { ok: false, message: "Không tìm thấy đơn đặt chỗ." };

  const outcome = applyBookingAction(current, parsed.data.action, new Date().toISOString());
  if (!outcome.ok) return outcome;

  await writeStoredBookings(bookings.map((b, i) => (i === index ? outcome.booking : b)));
  return { ok: true, message: SIMULATE_SUCCESS[parsed.data.action] };
}
