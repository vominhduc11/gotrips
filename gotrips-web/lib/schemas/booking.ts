import { z } from "zod";
import { getTodayInVietnam } from "@/lib/data/tour-view";
import { isIsoDate } from "@/lib/iso-date";
import { emailSchema } from "./auth";

/**
 * Tối đa số khách mỗi đơn tour. Luật đặt chỗ do gotrips-api kiểm lại (`CreateTourBookingRequest`) với CÙNG câu báo lỗi:
 * đổi giới hạn hay câu chữ ở đây (hay ở `hotel-booking.ts`, `flight-booking.ts`, `flight-search.ts`) phải đổi cả API.
 */
export const MAX_GUESTS_PER_BOOKING = 10;

// ---------------------------------------------------------------------------
// Chọn chuyến + số khách (thẻ "Đặt tour" ở trang chi tiết) và các bước đặt tour (`/tours/[slug]/book`)
// ---------------------------------------------------------------------------

/**
 * Các bước của trang đặt tour; phần tử đầu là bước mặc định (không ghi vào URL).
 * Chọn ngày khởi hành và số khách KHÔNG phải một bước ở đây: khách chọn ngay trên thẻ "Đặt tour" của trang chi tiết.
 */
export const BOOKING_STEPS = [
  { value: "thong-tin", label: "Thông tin" },
  { value: "xac-nhan", label: "Xác nhận" },
] as const;

export type BookingStep = (typeof BOOKING_STEPS)[number]["value"];
export const DEFAULT_BOOKING_STEP: BookingStep = "thong-tin";

/** `id` của thẻ "Đặt tour" ở trang chi tiết — đích cuộn của liên kết "Thay đổi" từ trang đặt tour. */
export const TOUR_BOOKING_CARD_ID = "dat-tour";

const first = (value: unknown) => (Array.isArray(value) ? value[0] : value);

/**
 * Tham số URL của trang đặt tour (và của trang chi tiết, khi khách quay lại đổi chuyến). Giá trị rác không làm trang
 * lỗi mà rơi về mặc định (`catch`). URL chỉ chứa lựa chọn chuyến và số khách — thông tin cá nhân (người liên hệ, người
 * đi) KHÔNG đưa lên URL. Việc chuyến có còn đặt được không do trang kiểm tra (cần dữ liệu lịch khởi hành), không phải schema.
 */
export const bookingParamsSchema = z.object({
  departure: z.preprocess(first, z.coerce.number().int().positive().optional().catch(undefined)),
  guests: z.preprocess(first, z.coerce.number().int().min(1).max(MAX_GUESTS_PER_BOOKING).catch(1)),
  step: z.preprocess(
    first,
    z.enum(BOOKING_STEPS.map((s) => s.value) as [BookingStep, ...BookingStep[]]).catch(DEFAULT_BOOKING_STEP),
  ),
});

export type BookingParams = z.infer<typeof bookingParamsSchema>;
export type TripParams = Pick<BookingParams, "departure" | "guests">;

export function parseBookingParams(raw: Record<string, string | string[] | undefined>): BookingParams {
  return bookingParamsSchema.parse(raw);
}

/** Chỉ đọc bước (`?step=`) — dùng cho trang đặt phòng / đặt vé, nơi lựa chọn nằm ở các tham số khác. */
export function parseBookingStep(raw: Record<string, string | string[] | undefined>): BookingStep {
  return bookingParamsSchema.shape.step.parse(raw.step);
}

/** Chuỗi query (không có dấu `?`) chỉ gồm chuyến + số khách; bỏ giá trị mặc định cho URL gọn. */
export function buildTripSearch(params: TripParams): string {
  const search = new URLSearchParams();
  if (params.departure) search.set("departure", String(params.departure));
  if (params.guests > 1) search.set("guests", String(params.guests));
  return search.toString();
}

/** Chuỗi query (không có dấu `?`) của trang đặt tour; bỏ giá trị mặc định cho URL gọn. */
export function buildBookingSearch(params: BookingParams): string {
  const search = new URLSearchParams(buildTripSearch(params));
  if (params.step !== DEFAULT_BOOKING_STEP) search.set("step", params.step);
  return search.toString();
}

export function buildBookingHref(tourSlug: string, params: BookingParams): string {
  const search = buildBookingSearch(params);
  return `/tours/${tourSlug}/book${search ? `?${search}` : ""}`;
}

/**
 * Trang chi tiết tour với chuyến + số khách điền sẵn vào thẻ "Đặt tour", cuộn tới thẻ đó. Dùng khi khách cần chọn lại
 * chuyến (mở trang đặt tour thiếu chuyến hoặc chuyến đã hết chỗ).
 */
export function buildTourBookingHref(tourSlug: string, params: TripParams): string {
  const search = buildTripSearch(params);
  return `/tours/${tourSlug}${search ? `?${search}` : ""}#${TOUR_BOOKING_CARD_ID}`;
}

// ---------------------------------------------------------------------------
// Form đặt tour (React Hook Form) + Server Action
// ---------------------------------------------------------------------------

const DEPARTURE_MESSAGE = "Vui lòng chọn ngày khởi hành.";
const GUESTS_MESSAGE = `Số khách phải từ 1 đến ${MAX_GUESTS_PER_BOOKING}.`;
const TRAVELER_COUNT_MESSAGE = "Số người đi phải bằng số khách đã chọn.";

/** Họ tên một người (người liên hệ, người đi, người nhận phòng, hành khách). Dùng chung cho mọi luồng đặt. */
export const personNameSchema = (requiredMessage: string) =>
  z
    .string()
    .trim()
    .min(1, requiredMessage)
    .min(2, "Họ và tên cần có ít nhất 2 ký tự.")
    .max(100, "Họ và tên không được quá 100 ký tự.");

/**
 * Số di động Việt Nam: 0 hoặc +84, đầu số 3/5/7/8/9, rồi 8 chữ số; cho phép cách nhóm bằng khoảng trắng hoặc dấu chấm
 * ("0901 234 567") để khách gõ theo thói quen.
 */
const VIETNAM_PHONE = /^(?:\+84|0)[35789](?:[ .]?\d){8}$/;

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Vui lòng nhập số điện thoại.")
  .regex(VIETNAM_PHONE, "Số điện thoại chưa đúng, ví dụ: 0901 234 567.");

/** Người liên hệ của đơn — giống nhau ở tour, khách sạn, vé máy bay. */
export const contactSchema = z.object({
  fullName: personNameSchema("Vui lòng nhập họ tên người liên hệ."),
  email: emailSchema,
  phone: phoneSchema,
});

export type ContactValues = z.input<typeof contactSchema>;

/** Ghi chú / yêu cầu đặc biệt (không bắt buộc). */
export const noteSchema = z.string().trim().max(500, "Ghi chú không được quá 500 ký tự.");

const tripSelectionShape = {
  departureId: z.number({ error: DEPARTURE_MESSAGE }).int(DEPARTURE_MESSAGE).positive(DEPARTURE_MESSAGE),
  guests: z
    .number({ error: GUESTS_MESSAGE })
    .int(GUESTS_MESSAGE)
    .min(1, GUESTS_MESSAGE)
    .max(MAX_GUESTS_PER_BOOKING, GUESTS_MESSAGE),
};

/**
 * Lựa chọn chuyến + số khách: form của thẻ "Đặt tour" (trang chi tiết) và hộp thoại "Thay đổi" (trang đặt tour).
 * Giới hạn số khách theo số chỗ còn của từng chuyến do nút −/+ khoá và server kiểm lại lúc tạo đơn.
 */
export const tripSelectionSchema = z.object(tripSelectionShape);

export type TripSelectionValues = z.infer<typeof tripSelectionSchema>;

/** Dữ liệu nút "Đặt tour" gửi lên Server Action `startBookingAction` (slug đi vào đường dẫn nên chỉ nhận ký tự an toàn). */
export const startBookingRequestSchema = tripSelectionSchema.extend({
  tourSlug: z.string().regex(/^[a-z0-9-]+$/).max(220),
});

/**
 * Schema form đặt tour. Là hàm nhận `today` (như `createHotelSearchSchema`): ngày sinh không được sau hôm nay, mà
 * "hôm nay" phải lấy lúc validate chứ không phải lúc import; test truyền `today` cố định.
 *
 * `departureId` và `guests` nằm trong form (đồng bộ với URL) để kiểm chéo "số người đi = số khách" ngay trong schema.
 */
function bookingFormShape(today: string) {
  return {
    ...tripSelectionShape,
    contact: contactSchema,
    travelers: z
      .array(
        z.object({
          fullName: personNameSchema("Vui lòng nhập họ tên người đi."),
          // Ô trống = không nhập (ngày sinh không bắt buộc). Form dùng "" thay cho null để ô luôn là chuỗi.
          dateOfBirth: z
            .string()
            .refine((value) => value === "" || isIsoDate(value), "Ngày sinh chưa đúng định dạng.")
            .refine((value) => value === "" || value <= today, "Ngày sinh không được sau hôm nay."),
        }),
      )
      .min(1, TRAVELER_COUNT_MESSAGE)
      .max(MAX_GUESTS_PER_BOOKING, TRAVELER_COUNT_MESSAGE),
    note: noteSchema,
  };
}

/** Kiểm chéo dùng chung cho form và Server Action. Lỗi gắn vào `travelers` (cả danh sách). */
function checkTravelerCount(data: { guests: number; travelers: unknown[] }, ctx: z.RefinementCtx) {
  if (data.travelers.length !== data.guests) {
    ctx.addIssue({ code: "custom", path: ["travelers"], message: TRAVELER_COUNT_MESSAGE });
  }
}

export function createBookingFormSchema(today: string = getTodayInVietnam()) {
  return z.object(bookingFormShape(today)).superRefine(checkTravelerCount);
}

export type BookingFormValues = z.input<ReturnType<typeof createBookingFormSchema>>;

/**
 * Dữ liệu Server Action nhận: form + slug tour (đi vào đường dẫn chuyển hướng nên chỉ nhận ký tự an toàn). Không có
 * trường giá: API tự tính giá.
 */
export function createBookingRequestSchema(today: string = getTodayInVietnam()) {
  return z
    .object({ ...bookingFormShape(today), tourSlug: z.string().regex(/^[a-z0-9-]+$/).max(220) })
    .superRefine(checkTravelerCount);
}

export type BookingRequest = z.output<ReturnType<typeof createBookingRequestSchema>>;
