import { z } from "zod";
import { diffInDays, isIsoDate } from "@/lib/iso-date";
import { getTodayInVietnam } from "@/lib/data/tour-view";

/** Giới hạn của bộ chọn (cũng là giới hạn của "hợp đồng URL" `/hotels`). */
export const HOTEL_MAX_GUESTS = 30;
export const HOTEL_MAX_ROOMS = 10;

const DESTINATION_MESSAGE = "Vui lòng chọn điểm đến.";
const CHECK_IN_REQUIRED = "Vui lòng chọn ngày nhận phòng.";
const CHECK_OUT_REQUIRED = "Vui lòng chọn ngày trả phòng.";
const DATE_FORMAT_MESSAGE = "Ngày chưa đúng định dạng.";
const GUESTS_MESSAGE = `Số khách phải từ 1 đến ${HOTEL_MAX_GUESTS}.`;
const ROOMS_MESSAGE = `Số phòng phải từ 1 đến ${HOTEL_MAX_ROOMS}.`;

/**
 * Schema form tìm khách sạn ở Trang chủ. Là hàm nhận `today` (`YYYY-MM-DD`) thay vì hằng số vì:
 *  - "hôm nay" đổi theo thời điểm (form có thể mở qua nửa đêm) nên phải lấy lúc validate, không lúc import;
 *  - truyền vào được nên test không phụ thuộc đồng hồ máy.
 *
 * Luật: ngày nhận ≥ hôm nay; ngày trả > ngày nhận (ít nhất 1 đêm); 1 ≤ số phòng ≤ số khách.
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
      // Chỉ so sánh ngày khi chuỗi hợp lệ — lỗi định dạng đã được báo ở trường tương ứng.
      const checkInOk = isIsoDate(value.checkIn);
      if (checkInOk && diffInDays(value.checkIn, today) < 0) {
        ctx.addIssue({ code: "custom", path: ["checkIn"], message: "Ngày nhận phòng không được ở quá khứ." });
      }
      if (checkInOk && isIsoDate(value.checkOut) && diffInDays(value.checkOut, value.checkIn) <= 0) {
        ctx.addIssue({ code: "custom", path: ["checkOut"], message: "Ngày trả phòng phải sau ngày nhận phòng." });
      }
      if (value.rooms > value.guests) {
        ctx.addIssue({ code: "custom", path: ["rooms"], message: "Số phòng không được nhiều hơn số khách." });
      }
    });
}

export type HotelSearchValues = z.infer<ReturnType<typeof createHotelSearchSchema>>;

/**
 * Schema của gói dữ liệu điền sẵn ô tìm khách sạn khi bấm thẻ "Khách sạn nổi bật" (đi kèm sự kiện hash, xem
 * `lib/hash-navigation.ts`). Gói này là dữ liệu KHÔNG TIN CẬY — bất kỳ script nào trên trang cũng phát được sự kiện —
 * nên ngoài kiểu dữ liệu còn đối chiếu với danh sách điểm đến form đang có: ô "Điểm đến" là combobox chỉ chọn trong
 * danh sách đó, một slug lạ sẽ làm form coi là "đã có giá trị" trong khi ô vẫn hiện chữ gợi ý.
 * Chỉ nhận `destination`: KHÔNG điền ngày, số khách, số phòng (giữ nguyên những gì khách đã nhập).
 */
export function createHotelPrefillSchema(validDestinations: readonly string[]) {
  // `Set` thay vì tra thuộc tính của object để các chuỗi như "__proto__"/"constructor" không vô tình khớp.
  const allowed = new Set(validDestinations);
  return z.object({
    destination: z.string().refine((slug) => allowed.has(slug), "Điểm đến không nằm trong danh sách."),
  });
}

export type HotelSearchPrefill = z.infer<ReturnType<typeof createHotelPrefillSchema>>;

/**
 * "Hợp đồng URL" của trang `/hotels` (chưa có trang — làm sau). Trang đó sẽ đọc đúng các tham số này:
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
