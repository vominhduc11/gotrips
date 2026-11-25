"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { addStoredBooking } from "@/lib/booking/demo-store";
import { getFlightForBooking } from "@/lib/data/bookings";
import { computeFlightTotal } from "@/lib/data/flight-view";
import { getTodayInVietnam } from "@/lib/data/tour-view";
import { buildLoginHref } from "@/lib/safe-redirect";
import {
  buildFlightBookingHref,
  createFlightBookingRequestSchema,
  createStartFlightBookingSchema,
} from "@/lib/schemas/flight-booking";
import type { FlightSearchValues } from "@/lib/schemas/flight-search";
import type { FlightBooking, FlightOptionView } from "@/lib/types";
import type { BookingActionResult } from "./booking";
import { simulateLatency } from "./demo-latency";
import { toFieldErrors } from "./field-errors";

// PROTOTYPE: chưa có gotrips-api — đơn vé lưu cùng cookie với đơn tour (lib/booking/demo-store.ts), số ghế (mock) KHÔNG
// giảm. Khi có API: thay thân hàm bằng `POST /flight-bookings` (backend giữ ghế, tự tính giá), giữ nguyên chữ ký.

const SESSION_EXPIRED = "Phiên đăng nhập đã hết hạn. Bạn vui lòng đăng nhập lại để tiếp tục.";
const SAME_DAY_MESSAGE = "Chuyến bay trong ngày hôm nay đã đóng đặt vé trực tuyến. Bạn vui lòng chọn ngày khác.";
const MISSING_FLIGHT_MESSAGE = "Chuyến bay đã chọn không còn khai thác. Bạn vui lòng chọn chuyến khác.";

/**
 * Các chặng của lựa chọn: chiều đi (`from → to`, ngày đi) và chiều về (`to → from`, ngày về) nếu khứ hồi. Id do trình
 * duyệt gửi nên phải kiểm đúng chiều bay. Một chặng không khớp → `null`.
 */
async function loadSegments(
  search: FlightSearchValues,
  outboundId: number,
  returnId: number,
): Promise<FlightOptionView[] | null> {
  const outbound = await getFlightForBooking({
    scheduleId: outboundId,
    from: search.from,
    to: search.to,
    date: search.departDate,
    cabin: search.cabin,
  });
  if (!outbound) return null;
  if (search.tripType === "oneWay") return [outbound];

  const inbound = await getFlightForBooking({
    scheduleId: returnId,
    from: search.to,
    to: search.from,
    date: search.returnDate,
    cabin: search.cabin,
  });
  return inbound ? [outbound, inbound] : null;
}

/**
 * Nút "Chọn" ở trang kết quả (chuyến một chiều, hoặc chuyến về của khứ hồi): kiểm lựa chọn, kiểm phiên rồi chuyển thẳng
 * tới trang đặt vé (hoặc đăng nhập kèm `next`) — cùng lý do với `startBookingAction`.
 */
export async function startFlightBookingAction(values: unknown): Promise<{ ok: false; message: string }> {
  const today = getTodayInVietnam();
  const parsed = createStartFlightBookingSchema(today).safeParse(values);
  if (!parsed.success) return { ok: false, message: "Lựa chọn chuyến bay chưa hợp lệ. Bạn vui lòng chọn lại." };

  const { search, outboundId, returnId } = parsed.data;
  if (search.departDate <= today) return { ok: false, message: SAME_DAY_MESSAGE };
  if (!(await loadSegments(search, outboundId, returnId))) return { ok: false, message: MISSING_FLIGHT_MESSAGE };

  const bookingHref = buildFlightBookingHref(search, { out: outboundId, ret: returnId || undefined });
  const user = await getCurrentUser();
  redirect(user ? bookingHref : buildLoginHref(bookingHref));
}

/**
 * Tạo đơn vé máy bay. Kiểm đăng nhập, kiểm lại toàn bộ (lượt tìm, chiều bay của từng chuyến, số hành khách từng loại,
 * tuổi theo ngày bay) và TỰ TÍNH GIÁ từ lịch bay — dữ liệu gửi lên không có trường giá nào.
 */
export async function createFlightBookingAction(values: unknown): Promise<BookingActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };

  const today = getTodayInVietnam();
  const parsed = createFlightBookingRequestSchema(today).safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Thông tin đặt vé chưa hợp lệ. Bạn vui lòng kiểm tra lại các ô được đánh dấu.",
      fieldErrors: toFieldErrors(parsed.error.issues),
    };
  }

  await simulateLatency();

  const request = parsed.data;
  if (request.search.departDate <= today) return { ok: false, message: SAME_DAY_MESSAGE };
  const segments = await loadSegments(request.search, request.outboundId, request.returnId);
  if (!segments) return { ok: false, message: MISSING_FLIGHT_MESSAGE };

  const stored = segments.map((s) => ({ scheduleId: s.scheduleId, date: s.date, fares: s.fares }));
  const totalAmount = computeFlightTotal(stored, request.search);

  const booking = await addStoredBooking<FlightBooking>((code) => ({
    kind: "flight",
    code,
    ownerEmail: user.email,
    cabin: request.search.cabin,
    segments: stored,
    passengers: request.passengers.map((p) => ({
      type: p.type,
      fullName: p.fullName,
      dateOfBirth: p.dateOfBirth || null,
    })),
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
