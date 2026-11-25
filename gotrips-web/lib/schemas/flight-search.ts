import { z } from "zod";
import { diffInDays, isIsoDate } from "@/lib/iso-date";
import { getTodayInVietnam } from "@/lib/data/tour-view";

/** Tổng hành khách tối đa trên một lần tìm (gồm cả trẻ em và em bé). */
export const FLIGHT_MAX_PASSENGERS = 9;

export const TRIP_TYPE_OPTIONS = [
  { value: "oneWay", label: "Một chiều" },
  { value: "roundTrip", label: "Khứ hồi" },
] as const;

export const CABIN_OPTIONS = [
  { value: "economy", label: "Phổ thông" },
  { value: "premiumEconomy", label: "Phổ thông đặc biệt" },
  { value: "business", label: "Thương gia" },
  { value: "first", label: "Hạng nhất" },
] as const;

export type TripType = (typeof TRIP_TYPE_OPTIONS)[number]["value"];
export type CabinClass = (typeof CABIN_OPTIONS)[number]["value"];

const FROM_MESSAGE = "Vui lòng chọn điểm đi.";
const TO_MESSAGE = "Vui lòng chọn điểm đến.";
const DEPART_REQUIRED = "Vui lòng chọn ngày đi.";
const DATE_FORMAT_MESSAGE = "Ngày chưa đúng định dạng.";
const ADULTS_MESSAGE = "Cần ít nhất 1 người lớn.";
const COUNT_MESSAGE = "Số hành khách không hợp lệ.";

const AIRPORT_CODE = /^[A-Z]{3}$/;

const passengerCount = z.number({ error: COUNT_MESSAGE }).int(COUNT_MESSAGE).min(0, COUNT_MESSAGE);

/**
 * Schema form tìm vé máy bay (Trang chủ và trang `/flights`). Nhận `today` (`YYYY-MM-DD`) để lấy "hôm nay" lúc validate
 * và để test không phụ thuộc đồng hồ máy (cùng cách với `createHotelSearchSchema`).
 *
 * Luật:
 *  - điểm đi ≠ điểm đến (mã IATA 3 chữ in hoa);
 *  - ngày đi ≥ hôm nay;
 *  - khứ hồi: bắt buộc có ngày về, và ngày về ≥ ngày đi (bay về trong ngày vẫn hợp lệ); một chiều: bỏ qua ngày về;
 *  - người lớn ≥ 1; em bé ≤ người lớn (mỗi em bé ngồi cùng một người lớn);
 *  - tổng hành khách (người lớn + trẻ em + em bé) ≤ 9.
 */
export function createFlightSearchSchema(today: string = getTodayInVietnam()) {
  return z
    .object({
      tripType: z.enum(["oneWay", "roundTrip"]),
      from: z.string().min(1, FROM_MESSAGE).regex(AIRPORT_CODE, FROM_MESSAGE),
      to: z.string().min(1, TO_MESSAGE).regex(AIRPORT_CODE, TO_MESSAGE),
      departDate: z.string().min(1, DEPART_REQUIRED).refine(isIsoDate, DATE_FORMAT_MESSAGE),
      /** Có thể trống; chỉ bắt buộc khi khứ hồi (kiểm ở `superRefine`). */
      returnDate: z.string(),
      adults: z.number({ error: ADULTS_MESSAGE }).int(ADULTS_MESSAGE).min(1, ADULTS_MESSAGE),
      children: passengerCount,
      infants: passengerCount,
      cabin: z.enum(["economy", "premiumEconomy", "business", "first"]),
    })
    .superRefine((value, ctx) => {
      if (value.from && value.to && value.from === value.to) {
        ctx.addIssue({ code: "custom", path: ["to"], message: "Điểm đến phải khác điểm đi." });
      }

      const departOk = isIsoDate(value.departDate);
      if (departOk && diffInDays(value.departDate, today) < 0) {
        ctx.addIssue({ code: "custom", path: ["departDate"], message: "Ngày đi không được ở quá khứ." });
      }

      if (value.tripType === "roundTrip") {
        if (value.returnDate === "") {
          ctx.addIssue({ code: "custom", path: ["returnDate"], message: "Vui lòng chọn ngày về." });
        } else if (!isIsoDate(value.returnDate)) {
          ctx.addIssue({ code: "custom", path: ["returnDate"], message: DATE_FORMAT_MESSAGE });
        } else if (departOk && diffInDays(value.returnDate, value.departDate) < 0) {
          ctx.addIssue({ code: "custom", path: ["returnDate"], message: "Ngày về không được trước ngày đi." });
        }
      }

      if (value.infants > value.adults) {
        ctx.addIssue({
          code: "custom",
          path: ["infants"],
          message: "Số em bé không được nhiều hơn số người lớn.",
        });
      }
      if (value.adults + value.children + value.infants > FLIGHT_MAX_PASSENGERS) {
        ctx.addIssue({
          code: "custom",
          path: ["adults"],
          message: `Tổng số hành khách tối đa là ${FLIGHT_MAX_PASSENGERS}.`,
        });
      }
    });
}

export type FlightSearchValues = z.infer<ReturnType<typeof createFlightSearchSchema>>;

/**
 * Schema của gói dữ liệu điền sẵn ô tìm vé máy bay khi bấm thẻ "Chặng bay phổ biến" (đi kèm sự kiện hash, xem
 * `lib/hash-navigation.ts`). Gói này là dữ liệu KHÔNG TIN CẬY nên phải là mã IATA 3 chữ in hoa, nằm trong danh sách
 * sân bay form đang có (combobox chỉ chọn trong danh sách đó), và điểm đi ≠ điểm đến (giống luật của form).
 * Chặng bay là một cặp đi liền nhau nên sai một đầu thì bỏ cả gói, không điền nửa chừng.
 * Chỉ nhận `from`, `to`: KHÔNG đụng tới loại hành trình, ngày, hành khách, hạng ghế.
 */
export function createFlightPrefillSchema(validAirportCodes: readonly string[]) {
  const allowed = new Set(validAirportCodes);
  const airport = z
    .string()
    .regex(AIRPORT_CODE, "Mã sân bay không hợp lệ.")
    .refine((code) => allowed.has(code), "Sân bay không nằm trong danh sách.");

  return z
    .object({ from: airport, to: airport })
    .refine((value) => value.from !== value.to, { path: ["to"], message: "Điểm đến phải khác điểm đi." });
}

export type FlightSearchPrefill = z.infer<ReturnType<typeof createFlightPrefillSchema>>;

/**
 * "Hợp đồng URL" của kết quả tìm chuyến bay ở trang `/flights` (form submit bằng hàm này, trang đọc bằng
 * `parseFlightSearchParams`):
 * `/flights?tripType=&from=&to=&departDate=&returnDate=&adults=&children=&infants=&cabin=`.
 * `returnDate` chỉ xuất hiện khi khứ hồi. Hàm thuần, nhận giá trị đã validate; thứ tự tham số cố định.
 */
export function buildFlightSearchParams(values: FlightSearchValues): URLSearchParams {
  const params = new URLSearchParams();
  params.set("tripType", values.tripType);
  params.set("from", values.from);
  params.set("to", values.to);
  params.set("departDate", values.departDate);
  if (values.tripType === "roundTrip") params.set("returnDate", values.returnDate);
  params.set("adults", String(values.adults));
  params.set("children", String(values.children));
  params.set("infants", String(values.infants));
  params.set("cabin", values.cabin);
  return params;
}

/** Nhãn tiếng Việt của hạng ghế. */
export function cabinLabel(cabin: CabinClass): string {
  return CABIN_OPTIONS.find((option) => option.value === cabin)?.label ?? cabin;
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Tham số tìm vé có mặt trên URL (dù hợp lệ hay không) — để trang biết khách đã thử tìm. */
export function hasFlightSearchParams(raw: Record<string, string | string[] | undefined>): boolean {
  return ["tripType", "from", "to", "departDate", "returnDate", "adults", "cabin"].some((key) => raw[key] !== undefined);
}

/**
 * Đọc tham số URL của trang `/flights` (và trang đặt vé) bằng đúng schema của form. Thiếu hoặc sai bất kỳ tham số
 * nào → `null`. Một chiều thì `returnDate` luôn là chuỗi rỗng, dù URL còn sót giá trị.
 */
export function parseFlightSearchParams(
  raw: Record<string, string | string[] | undefined>,
  today: string = getTodayInVietnam(),
): FlightSearchValues | null {
  const number = (key: string, fallback?: number) => {
    const value = first(raw[key]);
    if (value === undefined || value === "") return fallback ?? Number.NaN;
    return Number(value);
  };
  const tripType = first(raw.tripType);
  const parsed = createFlightSearchSchema(today).safeParse({
    tripType,
    from: first(raw.from) ?? "",
    to: first(raw.to) ?? "",
    departDate: first(raw.departDate) ?? "",
    returnDate: tripType === "roundTrip" ? (first(raw.returnDate) ?? "") : "",
    adults: number("adults"),
    // Trẻ em / em bé vắng mặt trên URL = 0 (URL gõ tay thường bỏ hai tham số này).
    children: number("children", 0),
    infants: number("infants", 0),
    cabin: first(raw.cabin) ?? "economy",
  });
  return parsed.success ? parsed.data : null;
}
