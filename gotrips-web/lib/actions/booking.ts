"use server";

import { redirect } from "next/navigation";
import { createTourBooking } from "@/lib/api/generated";
import { bearerRequestInit } from "@/lib/auth/bearer";
import { getCurrentUser } from "@/lib/auth/session";
import { getTodayInVietnam } from "@/lib/data/tour-view";
import { buildLoginHref } from "@/lib/safe-redirect";
import {
  buildBookingHref,
  createBookingRequestSchema,
  DEFAULT_BOOKING_STEP,
  startBookingRequestSchema,
} from "@/lib/schemas/booking";
import { submitBooking, type BookingActionResult } from "./booking-submit";
import { toFieldErrors } from "./field-errors";

// Server Action của đơn tour. Đơn khách sạn: hotel-booking.ts; vé máy bay: flight-booking.ts. Việc giữ chỗ, tính giá và
// mọi luật đặt chỗ do gotrips-api làm; ở đây chỉ kiểm dữ liệu (báo lỗi sớm cho form) rồi gọi API.

/** Field lỗi của API mà form đặt tour nhận được: ô của form, hoặc chuyến/số khách (hiện ở đầu form). */
const TOUR_FORM_FIELD = /^(departureId|guests|note|contact\.(fullName|email|phone)|travelers(\.\d+\.(fullName|dateOfBirth))?)$/;

/**
 * Nút "Đặt tour" ở trang chi tiết: kiểm tra phiên rồi chuyển thẳng tới trang đặt tour, hoặc tới đăng nhập (kèm `next`)
 * nếu chưa đăng nhập. Thẻ "Đặt tour" thuộc phần tĩnh của trang nên không tự biết phiên. Chuyến còn đặt được hay không do
 * `BookingGate` (theo dữ liệu API) và API kiểm.
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

/** Tạo đơn đặt tour (`POST /bookings/tours`). KHÔNG gửi giá: mã đơn, tổng tiền và trạng thái do API trả về. */
export async function createBookingAction(values: unknown): Promise<BookingActionResult> {
  const parsed = createBookingRequestSchema(getTodayInVietnam()).safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Thông tin đặt tour chưa hợp lệ. Bạn vui lòng kiểm tra lại các ô được đánh dấu.",
      fieldErrors: toFieldErrors(parsed.error.issues),
    };
  }

  const { tourSlug, departureId, guests, contact, travelers, note } = parsed.data;
  return submitBooking({
    label: "Đặt tour",
    loginNext: buildBookingHref(tourSlug, { departure: departureId, guests, step: DEFAULT_BOOKING_STEP }),
    isFormField: (field) => TOUR_FORM_FIELD.test(field),
    staleTags: ["tours", "departures"],
    create: async (token) => {
      const { data } = await createTourBooking(
        {
          departureId,
          guests,
          contact,
          travelers: travelers.map((t) => ({ fullName: t.fullName, dateOfBirth: t.dateOfBirth || null })),
          note: note || null,
        },
        bearerRequestInit(token),
      );
      return data;
    },
  });
}
