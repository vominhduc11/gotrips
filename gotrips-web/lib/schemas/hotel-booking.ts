import { z } from "zod";
import { getTodayInVietnam } from "@/lib/data/tour-view";
import { isIsoDate } from "@/lib/iso-date";
import type { HotelRoomType } from "@/lib/types";
import { BOOKING_STEPS, contactSchema, DEFAULT_BOOKING_STEP, noteSchema, personNameSchema, type BookingStep } from "./booking";
import { checkStayDates, HOTEL_MAX_GUESTS, HOTEL_MAX_ROOMS } from "./hotel-search";

/**
 * Luồng đặt phòng khách sạn: thẻ "Đặt phòng" ở trang chi tiết (`/hotels/[slug]`) → trang đặt phòng 2 bước
 * (`/hotels/[slug]/book`), cùng khuôn với luồng đặt tour (xem `booking.ts`).
 */

/** `id` của thẻ "Đặt phòng" ở trang chi tiết — đích cuộn của liên kết "Thay đổi" từ trang đặt phòng. */
export const HOTEL_BOOKING_CARD_ID = "dat-phong";

/** Mặc định khi URL không ghi (giống form tìm khách sạn). */
export const DEFAULT_HOTEL_GUESTS = 2;
export const DEFAULT_HOTEL_ROOMS = 1;

const DATE_FORMAT_MESSAGE = "Ngày chưa đúng định dạng.";
const ROOM_MESSAGE = "Vui lòng chọn loại phòng.";
const GUESTS_MESSAGE = `Số khách phải từ 1 đến ${HOTEL_MAX_GUESTS}.`;
const ROOMS_MESSAGE = `Số phòng phải từ 1 đến ${HOTEL_MAX_ROOMS}.`;

const first = (value: unknown) => (Array.isArray(value) ? value[0] : value);

// ---------------------------------------------------------------------------
// Tham số URL: lựa chọn lưu trú (trang chi tiết + trang đặt phòng) và bước
// ---------------------------------------------------------------------------

/**
 * Tham số URL `?room&checkIn&checkOut&guests&rooms&step`. Giá trị rác không làm trang lỗi mà rơi về mặc định / bỏ trống
 * (`catch`). Chỉ kiểm KIỂU ở đây; lựa chọn có đặt được không (ngày, sức chứa của loại phòng) cần dữ liệu khách sạn nên
 * do `normalizeHotelStay` kiểm. Thông tin cá nhân KHÔNG đưa lên URL.
 */
export const hotelStayParamsSchema = z.object({
  room: z.preprocess(first, z.coerce.number().int().positive().optional().catch(undefined)),
  checkIn: z.preprocess(first, z.string().refine(isIsoDate).optional().catch(undefined)),
  checkOut: z.preprocess(first, z.string().refine(isIsoDate).optional().catch(undefined)),
  guests: z.preprocess(first, z.coerce.number().int().min(1).max(HOTEL_MAX_GUESTS).catch(DEFAULT_HOTEL_GUESTS)),
  rooms: z.preprocess(first, z.coerce.number().int().min(1).max(HOTEL_MAX_ROOMS).catch(DEFAULT_HOTEL_ROOMS)),
  step: z.preprocess(
    first,
    z.enum(BOOKING_STEPS.map((s) => s.value) as [BookingStep, ...BookingStep[]]).catch(DEFAULT_BOOKING_STEP),
  ),
});

export type HotelStayParams = z.infer<typeof hotelStayParamsSchema>;
export type HotelStaySelection = Omit<HotelStayParams, "step">;

export function parseHotelStayParams(raw: Record<string, string | string[] | undefined>): HotelStayParams {
  return hotelStayParamsSchema.parse(raw);
}

/** Chuỗi query (không có `?`) của lựa chọn lưu trú; bỏ giá trị trống/mặc định cho URL gọn. Thứ tự cố định. */
export function buildHotelStaySearch(stay: HotelStaySelection, step: BookingStep = DEFAULT_BOOKING_STEP): string {
  const search = new URLSearchParams();
  if (stay.room) search.set("room", String(stay.room));
  if (stay.checkIn) search.set("checkIn", stay.checkIn);
  if (stay.checkOut) search.set("checkOut", stay.checkOut);
  if (stay.guests !== DEFAULT_HOTEL_GUESTS) search.set("guests", String(stay.guests));
  if (stay.rooms !== DEFAULT_HOTEL_ROOMS) search.set("rooms", String(stay.rooms));
  if (step !== DEFAULT_BOOKING_STEP) search.set("step", step);
  return search.toString();
}

export function buildHotelBookingHref(hotelSlug: string, stay: HotelStaySelection, step?: BookingStep): string {
  const search = buildHotelStaySearch(stay, step);
  return `/hotels/${hotelSlug}/book${search ? `?${search}` : ""}`;
}

/**
 * Trang chi tiết khách sạn, điền sẵn lựa chọn vào thẻ "Đặt phòng". `scrollToCard`: cuộn thẳng tới thẻ (khi khách quay
 * lại để chọn lại); từ kết quả tìm kiếm thì không, để khách xem khách sạn từ đầu trang.
 */
export function buildHotelDetailHref(
  hotelSlug: string,
  stay: Partial<HotelStaySelection> = {},
  { scrollToCard = true }: { scrollToCard?: boolean } = {},
): string {
  const search = buildHotelStaySearch({
    guests: DEFAULT_HOTEL_GUESTS,
    rooms: DEFAULT_HOTEL_ROOMS,
    ...stay,
  });
  return `/hotels/${hotelSlug}${search ? `?${search}` : ""}${scrollToCard ? `#${HOTEL_BOOKING_CARD_ID}` : ""}`;
}

// ---------------------------------------------------------------------------
// Form "Đặt phòng" (trang chi tiết) — cần danh sách loại phòng để kiểm sức chứa
// ---------------------------------------------------------------------------

const stayShape = {
  roomTypeId: z.number({ error: ROOM_MESSAGE }).int(ROOM_MESSAGE).positive(ROOM_MESSAGE),
  checkIn: z.string().min(1, "Vui lòng chọn ngày nhận phòng.").refine(isIsoDate, DATE_FORMAT_MESSAGE),
  checkOut: z.string().min(1, "Vui lòng chọn ngày trả phòng.").refine(isIsoDate, DATE_FORMAT_MESSAGE),
  guests: z.number({ error: GUESTS_MESSAGE }).int(GUESTS_MESSAGE).min(1, GUESTS_MESSAGE).max(HOTEL_MAX_GUESTS, GUESTS_MESSAGE),
  rooms: z.number({ error: ROOMS_MESSAGE }).int(ROOMS_MESSAGE).min(1, ROOMS_MESSAGE).max(HOTEL_MAX_ROOMS, ROOMS_MESSAGE),
};

type StayValues = { roomTypeId: number; checkIn: string; checkOut: string; guests: number; rooms: number };

/** Kiểm chéo lựa chọn lưu trú với loại phòng của khách sạn. Dùng chung cho form và Server Action. */
function checkStay(
  value: StayValues,
  ctx: z.RefinementCtx,
  roomTypes: Pick<HotelRoomType, "id" | "maxGuests">[],
  today: string,
) {
  checkStayDates(value, ctx, today);
  if (value.rooms > value.guests) {
    ctx.addIssue({ code: "custom", path: ["rooms"], message: "Số phòng không được nhiều hơn số khách." });
  }
  const room = roomTypes.find((r) => r.id === value.roomTypeId);
  if (!room) {
    ctx.addIssue({ code: "custom", path: ["roomTypeId"], message: ROOM_MESSAGE });
  } else if (value.guests > room.maxGuests * value.rooms) {
    ctx.addIssue({
      code: "custom",
      path: ["guests"],
      message: `Loại phòng này ở tối đa ${room.maxGuests} khách mỗi phòng. Bạn vui lòng tăng số phòng hoặc chọn loại phòng khác.`,
    });
  }
}

/**
 * Schema của form "Đặt phòng" ở trang chi tiết và của lựa chọn lưu trú khi tới trang đặt phòng. Là hàm nhận danh sách
 * loại phòng (để kiểm "chọn đúng phòng của khách sạn này" và sức chứa) và `today` (lấy lúc validate, test truyền cố định).
 */
export function createHotelStaySchema(
  roomTypes: Pick<HotelRoomType, "id" | "maxGuests">[],
  today: string = getTodayInVietnam(),
) {
  return z.object(stayShape).superRefine((value, ctx) => checkStay(value, ctx, roomTypes, today));
}

export type HotelStayValues = z.infer<ReturnType<typeof createHotelStaySchema>>;

/** Dữ liệu nút "Đặt phòng" gửi lên `startHotelBookingAction` (server kiểm lại với dữ liệu khách sạn). */
export const startHotelBookingRequestSchema = z.object({
  ...stayShape,
  hotelSlug: z.string().regex(/^[a-z0-9-]+$/).max(220),
});

// ---------------------------------------------------------------------------
// Trang đặt phòng: thông tin cá nhân + Server Action
// ---------------------------------------------------------------------------

const hotelBookingFormShape = {
  contact: contactSchema,
  /** Người nhận phòng: xuất trình giấy tờ ở quầy lễ tân, có thể khác người liên hệ (đặt hộ). */
  guestName: personNameSchema("Vui lòng nhập họ tên người nhận phòng."),
  note: noteSchema,
};

/** Form bước "Thông tin" của trang đặt phòng. Lựa chọn lưu trú nằm trên URL, không nằm trong form này. */
export const hotelBookingFormSchema = z.object(hotelBookingFormShape);

export type HotelBookingFormValues = z.input<typeof hotelBookingFormSchema>;

/**
 * Dữ liệu `createHotelBookingAction` nhận: form + lựa chọn lưu trú + slug. Là hàm vì cần loại phòng của khách sạn (server
 * tìm khách sạn theo slug trước, rồi mới dựng schema). Không có trường giá: server tự tính.
 */
export function createHotelBookingRequestSchema(
  roomTypes: Pick<HotelRoomType, "id" | "maxGuests">[],
  today: string = getTodayInVietnam(),
) {
  return z
    .object({ ...hotelBookingFormShape, ...stayShape, hotelSlug: z.string().trim().min(1).max(220) })
    .superRefine((value, ctx) => checkStay(value, ctx, roomTypes, today));
}

/** Kiểm sơ bộ để lấy slug trước khi tải dữ liệu khách sạn (dữ liệu từ trình duyệt nên mọi trường khác chưa tin được). */
export const hotelBookingSlugSchema = z.object({ hotelSlug: z.string().regex(/^[a-z0-9-]+$/).max(220) });
