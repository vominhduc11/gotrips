import { z } from "zod";
import { diffInDays, isIsoDate } from "@/lib/iso-date";
import { getTodayInVietnam } from "@/lib/data/tour-view";

/** Giới hạn của bộ chọn (cũng là giới hạn của "hợp đồng URL" `/hotels`). */
export const HOTEL_MAX_GUESTS = 30;
export const HOTEL_MAX_ROOMS = 10;
/** Số đêm tối đa một lần đặt. */
export const HOTEL_MAX_NIGHTS = 30;

const DESTINATION_MESSAGE = "Vui lòng chọn điểm đến.";
const CHECK_IN_REQUIRED = "Vui lòng chọn ngày nhận phòng.";
const CHECK_OUT_REQUIRED = "Vui lòng chọn ngày trả phòng.";
const DATE_FORMAT_MESSAGE = "Ngày chưa đúng định dạng.";
const GUESTS_MESSAGE = `Số khách phải từ 1 đến ${HOTEL_MAX_GUESTS}.`;
const ROOMS_MESSAGE = `Số phòng phải từ 1 đến ${HOTEL_MAX_ROOMS}.`;

/**
 * Luật ngày lưu trú dùng chung cho form tìm khách sạn và form "Đặt phòng": ngày nhận ≥ hôm nay; ngày trả > ngày nhận
 * (ít nhất 1 đêm) và không quá `HOTEL_MAX_NIGHTS` đêm. Chỉ so sánh khi chuỗi hợp lệ — lỗi định dạng đã báo ở trường.
 */
export function checkStayDates(
  value: { checkIn: string; checkOut: string },
  ctx: z.RefinementCtx,
  today: string,
): void {
  const checkInOk = isIsoDate(value.checkIn);
  if (checkInOk && diffInDays(value.checkIn, today) < 0) {
    ctx.addIssue({ code: "custom", path: ["checkIn"], message: "Ngày nhận phòng không được ở quá khứ." });
  }
  if (!checkInOk || !isIsoDate(value.checkOut)) return;
  const nights = diffInDays(value.checkOut, value.checkIn);
  if (nights <= 0) {
    ctx.addIssue({ code: "custom", path: ["checkOut"], message: "Ngày trả phòng phải sau ngày nhận phòng." });
  } else if (nights > HOTEL_MAX_NIGHTS) {
    ctx.addIssue({ code: "custom", path: ["checkOut"], message: `Mỗi lần đặt tối đa ${HOTEL_MAX_NIGHTS} đêm.` });
  }
}

/**
 * Schema form tìm khách sạn (Trang chủ và trang `/hotels`). Là hàm nhận `today` (`YYYY-MM-DD`) thay vì hằng số vì:
 *  - "hôm nay" đổi theo thời điểm (form có thể mở qua nửa đêm) nên phải lấy lúc validate, không lúc import;
 *  - truyền vào được nên test không phụ thuộc đồng hồ máy.
 *
 * Luật: ngày như `checkStayDates`; 1 ≤ số phòng ≤ số khách.
 * Ngày là chuỗi `YYYY-MM-DD` (kiểu DATE, không múi giờ).
 */
export function createHotelSearchSchema(today: string = getTodayInVietnam()) {
  return z
    .object({
      /** Slug điểm đến (cùng quy ước với `/tours?destination=`). */
      destination: z.string().trim().min(1, DESTINATION_MESSAGE),
      checkIn: z.string().min(1, CHECK_IN_REQUIRED).refine(isIsoDate, DATE_FORMAT_MESSAGE),
      checkOut: z.string().min(1, CHECK_OUT_REQUIRED).refine(isIsoDate, DATE_FORMAT_MESSAGE),
      guests: z
        .number({ error: GUESTS_MESSAGE })
        .int(GUESTS_MESSAGE)
        .min(1, GUESTS_MESSAGE)
        .max(HOTEL_MAX_GUESTS, GUESTS_MESSAGE),
      rooms: z
        .number({ error: ROOMS_MESSAGE })
        .int(ROOMS_MESSAGE)
        .min(1, ROOMS_MESSAGE)
        .max(HOTEL_MAX_ROOMS, ROOMS_MESSAGE),
    })
    .superRefine((value, ctx) => {
      checkStayDates(value, ctx, today);
      if (value.rooms > value.guests) {
        ctx.addIssue({ code: "custom", path: ["rooms"], message: "Số phòng không được nhiều hơn số khách." });
      }
    });
}

export type HotelSearchValues = z.infer<ReturnType<typeof createHotelSearchSchema>>;

/**
 * "Hợp đồng URL" của kết quả tìm khách sạn ở trang `/hotels` (form submit bằng hàm này, trang đọc bằng
 * `parseHotelSearchParams`):
 * `/hotels?destination=<slug>&checkIn=<yyyy-mm-dd>&checkOut=<yyyy-mm-dd>&guests=<n>&rooms=<n>`.
 * Hàm thuần, nhận giá trị đã validate; thứ tự tham số cố định để URL ổn định (dễ test, dễ cache).
 */
export function buildHotelSearchParams(values: HotelSearchValues): URLSearchParams {
  const params = new URLSearchParams();
  params.set("destination", values.destination);
  params.set("checkIn", values.checkIn);
  params.set("checkOut", values.checkOut);
  params.set("guests", String(values.guests));
  params.set("rooms", String(values.rooms));
  return params;
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Tham số tìm kiếm khách sạn có mặt trên URL (dù hợp lệ hay không) — để trang biết khách đã thử tìm. */
export function hasHotelSearchParams(raw: Record<string, string | string[] | undefined>): boolean {
  return ["destination", "checkIn", "checkOut", "guests", "rooms"].some((key) => raw[key] !== undefined);
}

/**
 * Đọc tham số URL của trang `/hotels` bằng đúng schema của form (cùng luật, cùng "hôm nay"). URL ai cũng sửa được:
 * thiếu hoặc sai bất kỳ tham số nào → `null` (trang hiện gợi ý thay vì kết quả), không làm trang lỗi.
 */
export function parseHotelSearchParams(
  raw: Record<string, string | string[] | undefined>,
  today: string = getTodayInVietnam(),
): HotelSearchValues | null {
  const number = (key: string) => {
    const value = first(raw[key]);
    return value === undefined || value === "" ? Number.NaN : Number(value);
  };
  const parsed = createHotelSearchSchema(today).safeParse({
    destination: first(raw.destination) ?? "",
    checkIn: first(raw.checkIn) ?? "",
    checkOut: first(raw.checkOut) ?? "",
    guests: number("guests"),
    rooms: number("rooms"),
  });
  return parsed.success ? parsed.data : null;
}
