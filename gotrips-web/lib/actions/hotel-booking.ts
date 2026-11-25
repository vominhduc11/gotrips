"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { addStoredBooking } from "@/lib/booking/demo-store";
import { getHotelForBooking } from "@/lib/data/bookings";
import { computeStayTotal, countNights } from "@/lib/data/hotel-view";
import { getTodayInVietnam } from "@/lib/data/tour-view";
import { buildLoginHref } from "@/lib/safe-redirect";
import {
  buildHotelBookingHref,
  createHotelBookingRequestSchema,
  hotelBookingSlugSchema,
  startHotelBookingRequestSchema,
} from "@/lib/schemas/hotel-booking";
import type { HotelBooking } from "@/lib/types";
import type { BookingActionResult } from "./booking";
import { simulateLatency } from "./demo-latency";
import { toFieldErrors } from "./field-errors";

// PROTOTYPE: chưa có gotrips-api — đơn khách sạn lưu cùng cookie với đơn tour (lib/booking/demo-store.ts), số phòng
// trống (mock) KHÔNG giảm. Khi có API: thay thân hàm bằng `POST /hotel-bookings` (backend giữ phòng, tự tính giá), giữ
// nguyên chữ ký và kiểu kết quả để form không phải sửa.

const SESSION_EXPIRED = "Phiên đăng nhập đã hết hạn. Bạn vui lòng đăng nhập lại để tiếp tục.";

/**
 * Nút "Đặt phòng" ở trang chi tiết khách sạn: kiểm lựa chọn với dữ liệu khách sạn, kiểm phiên rồi chuyển thẳng tới trang
 * đặt phòng (hoặc đăng nhập kèm `next`). Lý do không điều hướng client tới `/book` rồi để trang đó chuyển sang đăng nhập:
 * xem `startBookingAction` (Next giữ cây `/book` vừa ghé trong `<Activity>` kèm lệnh chuyển hướng).
 */
export async function startHotelBookingAction(values: unknown): Promise<{ ok: false; message: string }> {
  const parsed = startHotelBookingRequestSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: "Lựa chọn phòng chưa hợp lệ. Bạn vui lòng chọn lại." };

  const { hotelSlug, roomTypeId, checkIn, checkOut, guests, rooms } = parsed.data;
  const hotel = await getHotelForBooking(hotelSlug);
  if (!hotel) return { ok: false, message: "Khách sạn này hiện không nhận đặt phòng." };

  const bookingHref = buildHotelBookingHref(hotelSlug, { room: roomTypeId, checkIn, checkOut, guests, rooms });
  const user = await getCurrentUser();
  redirect(user ? bookingHref : buildLoginHref(bookingHref));
}

/**
 * Tạo đơn đặt phòng. Server Action là endpoint công khai: kiểm tra đăng nhập, kiểm lại toàn bộ (ngày, sức chứa của loại
 * phòng, loại phòng thuộc đúng khách sạn) và TỰ TÍNH GIÁ — dữ liệu gửi lên không có trường giá nào.
 */
export async function createHotelBookingAction(values: unknown): Promise<BookingActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };

  const slug = hotelBookingSlugSchema.safeParse(values);
  const hotel = slug.success ? await getHotelForBooking(slug.data.hotelSlug) : null;
  if (!hotel) return { ok: false, message: "Khách sạn này hiện không nhận đặt phòng." };

  const today = getTodayInVietnam();
  const parsed = createHotelBookingRequestSchema(hotel.roomTypes, today).safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Thông tin đặt phòng chưa hợp lệ. Bạn vui lòng kiểm tra lại các ô được đánh dấu.",
      fieldErrors: toFieldErrors(parsed.error.issues),
    };
  }

  await simulateLatency();

  const request = parsed.data;
  // Schema đã kiểm loại phòng thuộc khách sạn này nên luôn tìm thấy.
  const room = hotel.roomTypes.find((r) => r.id === request.roomTypeId)!;
  const nights = countNights(request.checkIn, request.checkOut);
  const totalAmount = computeStayTotal(room.pricePerNight, nights, request.rooms);

  const booking = await addStoredBooking<HotelBooking>((code) => ({
    kind: "hotel",
    code,
    ownerEmail: user.email,
    hotelId: hotel.hotelId,
    roomTypeId: room.id,
    checkIn: request.checkIn,
    checkOut: request.checkOut,
    nights,
    rooms: request.rooms,
    guestCount: request.guests,
    pricePerNight: room.pricePerNight,
    guestName: request.guestName,
    totalAmount,
    contact: request.contact,
    note: request.note || null,
    status: "PENDING",
    payment: { method: "BANK_TRANSFER", amount: totalAmount, status: "UNPAID", paidAt: null },
    createdAt: new Date().toISOString(),
    confirmedAt: null,
    cancelledAt: null,
  }));

  return { ok: true, code: booking.code, redirectTo: `/bookings/${booking.code}` };
}
