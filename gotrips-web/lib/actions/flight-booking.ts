"use server";

import { redirect } from "next/navigation";
import { createFlightBooking } from "@/lib/api/generated";
import { bearerRequestInit } from "@/lib/auth/bearer";
import { getCurrentUser } from "@/lib/auth/session";
import { API_CABIN, API_PASSENGER_TYPE } from "@/lib/data/flight-request";
import { getFlightForBooking } from "@/lib/data/flights";
import { getTodayInVietnam } from "@/lib/data/tour-view";
import { buildLoginHref } from "@/lib/safe-redirect";
import {
  buildFlightBookingHref,
  createFlightBookingRequestSchema,
  createStartFlightBookingSchema,
} from "@/lib/schemas/flight-booking";
import type { FlightSearchValues } from "@/lib/schemas/flight-search";
import type { FlightOptionView } from "@/lib/types";
import { submitBooking, type BookingActionResult } from "./booking-submit";
import { toFieldErrors } from "./field-errors";
import { SERVICE_UNAVAILABLE_MESSAGE } from "./messages";

// Server Action của đơn vé máy bay. Chiều bay, ghế còn lại, tuổi hành khách và giá do gotrips-api kiểm/tính; ở đây chỉ
// kiểm dữ liệu (báo lỗi sớm cho form) rồi gọi API.

const SAME_DAY_MESSAGE = "Chuyến bay trong ngày hôm nay đã đóng đặt vé trực tuyến. Bạn vui lòng chọn ngày khác.";
const MISSING_FLIGHT_MESSAGE = "Chuyến bay đã chọn không còn khai thác. Bạn vui lòng chọn chuyến khác.";

/**
 * Field lỗi của API mà form đặt vé nhận được: ô của form, hoặc lượt tìm/chuyến đã chọn (hiện ở đầu form; xem
 * `isTripField` ở `FlightBookingWizard`).
 */
const FLIGHT_FORM_FIELD =
  /^(outboundScheduleId|returnScheduleId|from|to|departDate|returnDate|cabin|note|contact\.(fullName|email|phone)|passengers(\.\d+\.(fullName|dateOfBirth))?)$/;

/** Các chặng của lựa chọn: chiều đi (`from → to`) và chiều về (`to → from`) nếu khứ hồi. */
function legsOf(search: FlightSearchValues, outboundId: number, returnId: number) {
  const { cabin, adults, children, infants } = search;
  const passengers = { cabin, adults, children, infants };
  const outbound = { scheduleId: outboundId, query: { ...passengers, from: search.from, to: search.to, date: search.departDate } };
  if (search.tripType === "oneWay") return [outbound];
  return [outbound, { scheduleId: returnId, query: { ...passengers, from: search.to, to: search.from, date: search.returnDate } }];
}

/**
 * Nút "Chọn" ở trang kết quả (chuyến một chiều, hoặc chuyến về của khứ hồi): hỏi API (không cache) các chuyến còn đặt
 * được cho đủ số hành khách, kiểm phiên rồi chuyển thẳng tới trang đặt vé (hoặc đăng nhập kèm `next`) — cùng lý do với
 * `startBookingAction`.
 */
export async function startFlightBookingAction(values: unknown): Promise<{ ok: false; message: string }> {
  const today = getTodayInVietnam();
  const parsed = createStartFlightBookingSchema(today).safeParse(values);
  if (!parsed.success) return { ok: false, message: "Lựa chọn chuyến bay chưa hợp lệ. Bạn vui lòng chọn lại." };

  const { search, outboundId, returnId } = parsed.data;
  if (search.departDate <= today) return { ok: false, message: SAME_DAY_MESSAGE };

  let flights: (FlightOptionView | null)[];
  try {
    flights = await Promise.all(
      legsOf(search, outboundId, returnId).map((leg) => getFlightForBooking(leg.scheduleId, leg.query)),
    );
  } catch (error) {
    console.error("[đặt chỗ] Không kiểm được chuyến bay:", error instanceof Error ? error.message : error);
    return { ok: false, message: SERVICE_UNAVAILABLE_MESSAGE };
  }
  for (const flight of flights) {
    if (!flight) return { ok: false, message: MISSING_FLIGHT_MESSAGE };
    if (!flight.isBookable) {
      return {
        ok: false,
        message: `Chuyến ${flight.flightNumber} không còn đủ ghế ở hạng đã chọn. Bạn vui lòng chọn chuyến khác.`,
      };
    }
  }

  const bookingHref = buildFlightBookingHref(search, { out: outboundId, ret: returnId || undefined });
  const user = await getCurrentUser();
  redirect(user ? bookingHref : buildLoginHref(bookingHref));
}

/**
 * Tạo đơn vé máy bay (`POST /bookings/flights`). Kiểm số hành khách từng loại đúng như lượt tìm rồi gửi cho API; KHÔNG
 * gửi giá: API tự tính từ lịch bay và chốt vào đơn.
 */
export async function createFlightBookingAction(values: unknown): Promise<BookingActionResult> {
  const today = getTodayInVietnam();
  const parsed = createFlightBookingRequestSchema(today).safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Thông tin đặt vé chưa hợp lệ. Bạn vui lòng kiểm tra lại các ô được đánh dấu.",
      fieldErrors: toFieldErrors(parsed.error.issues),
    };
  }

  const { search, outboundId, returnId, contact, passengers, note } = parsed.data;
  if (search.departDate <= today) return { ok: false, message: SAME_DAY_MESSAGE };
  const roundTrip = search.tripType === "roundTrip";

  return submitBooking({
    label: "Đặt vé máy bay",
    loginNext: buildFlightBookingHref(search, { out: outboundId, ret: returnId || undefined }),
    isFormField: (field) => FLIGHT_FORM_FIELD.test(field),
    staleTags: ["flights"],
    create: async (token) => {
      const { data } = await createFlightBooking(
        {
          outboundScheduleId: outboundId,
          returnScheduleId: roundTrip ? returnId : null,
          from: search.from,
          to: search.to,
          departDate: search.departDate,
          returnDate: roundTrip ? search.returnDate : null,
          cabin: API_CABIN[search.cabin],
          contact,
          passengers: passengers.map((p) => ({
            type: API_PASSENGER_TYPE[p.type],
            fullName: p.fullName,
            dateOfBirth: p.dateOfBirth || null,
          })),
          note: note || null,
        },
        bearerRequestInit(token),
      );
      return data;
    },
  });
}
