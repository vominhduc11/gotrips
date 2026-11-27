"use server";

import { redirect } from "next/navigation";
import { createHotelBooking } from "@/lib/api/generated";
import { bearerRequestInit } from "@/lib/auth/bearer";
import { getCurrentUser } from "@/lib/auth/session";
import { getHotelDetail } from "@/lib/data/hotels";
import { getTodayInVietnam } from "@/lib/data/tour-view";
import { buildLoginHref } from "@/lib/safe-redirect";
import {
  buildHotelBookingHref,
  createHotelBookingRequestSchema,
  hotelBookingSlugSchema,
  startHotelBookingRequestSchema,
} from "@/lib/schemas/hotel-booking";
import type { HotelDetailView } from "@/lib/types";
import { submitBooking, type BookingActionResult } from "./booking-submit";
import { toFieldErrors } from "./field-errors";
import { SERVICE_UNAVAILABLE_MESSAGE } from "./messages";

// Server Action của đơn đặt phòng. Phòng trống, giá và mọi luật đặt phòng do gotrips-api kiểm/tính; ở đây chỉ kiểm dữ
// liệu (báo lỗi sớm cho form) rồi gọi API.

const HOTEL_CLOSED_MESSAGE = "Khách sạn này hiện không nhận đặt phòng.";

/** Field lỗi của API mà form đặt phòng nhận được: ô của form, hoặc lựa chọn lưu trú (hiện ở đầu form). */
const HOTEL_FORM_FIELD = /^(roomTypeId|checkIn|checkOut|guests|rooms|guestName|note|contact\.(fullName|email|phone))$/;

/** Khách sạn đang nhận đặt (dữ liệu API); `"unavailable"` khi API lỗi (khác với khách sạn không có/bị ẩn là `null`). */
async function loadHotel(slug: string): Promise<HotelDetailView | null | "unavailable"> {
  try {
    return await getHotelDetail(slug);
  } catch (error) {
    console.error("[đặt chỗ] Không tải được khách sạn:", error instanceof Error ? error.message : error);
    return "unavailable";
  }
}

/**
 * Nút "Đặt phòng" ở trang chi tiết khách sạn: kiểm khách sạn còn nhận đặt, kiểm phiên rồi chuyển thẳng tới trang đặt
 * phòng (hoặc đăng nhập kèm `next`). Lý do không điều hướng client tới `/book` rồi để trang đó chuyển sang đăng nhập:
 * xem `startBookingAction` (Next giữ cây `/book` vừa ghé trong `<Activity>` kèm lệnh chuyển hướng).
 */
export async function startHotelBookingAction(values: unknown): Promise<{ ok: false; message: string }> {
  const parsed = startHotelBookingRequestSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: "Lựa chọn phòng chưa hợp lệ. Bạn vui lòng chọn lại." };

  const { hotelSlug, roomTypeId, checkIn, checkOut, guests, rooms } = parsed.data;
  const hotel = await loadHotel(hotelSlug);
  if (hotel === "unavailable") return { ok: false, message: SERVICE_UNAVAILABLE_MESSAGE };
  if (!hotel) return { ok: false, message: HOTEL_CLOSED_MESSAGE };

  const bookingHref = buildHotelBookingHref(hotelSlug, { room: roomTypeId, checkIn, checkOut, guests, rooms });
  const user = await getCurrentUser();
  redirect(user ? bookingHref : buildLoginHref(bookingHref));
}

/** Tạo đơn đặt phòng (`POST /bookings/hotels`). KHÔNG gửi giá: API tự tính và chốt vào đơn. */
export async function createHotelBookingAction(values: unknown): Promise<BookingActionResult> {
  const slug = hotelBookingSlugSchema.safeParse(values);
  const hotel = slug.success ? await loadHotel(slug.data.hotelSlug) : null;
  if (hotel === "unavailable") return { ok: false, message: SERVICE_UNAVAILABLE_MESSAGE };
  if (!hotel) return { ok: false, message: HOTEL_CLOSED_MESSAGE };

  const parsed = createHotelBookingRequestSchema(hotel.roomTypes, getTodayInVietnam()).safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Thông tin đặt phòng chưa hợp lệ. Bạn vui lòng kiểm tra lại các ô được đánh dấu.",
      fieldErrors: toFieldErrors(parsed.error.issues),
    };
  }

  const { hotelSlug, roomTypeId, checkIn, checkOut, guests, rooms, contact, guestName, note } = parsed.data;
  return submitBooking({
    label: "Đặt phòng",
    loginNext: buildHotelBookingHref(hotelSlug, { room: roomTypeId, checkIn, checkOut, guests, rooms }),
    isFormField: (field) => HOTEL_FORM_FIELD.test(field),
    staleTags: ["hotels"],
    create: async (token) => {
      const { data } = await createHotelBooking(
        { roomTypeId, checkIn, checkOut, guests, rooms, contact, guestName, note: note || null },
        bearerRequestInit(token),
      );
      return data;
    },
  });
}
