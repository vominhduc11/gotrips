import { z } from "zod";
import { getTodayInVietnam } from "@/lib/data/tour-view";
import { ageInYears, isIsoDate } from "@/lib/iso-date";
import type { PassengerType } from "@/lib/types";
import { BOOKING_STEPS, contactSchema, DEFAULT_BOOKING_STEP, noteSchema, personNameSchema, type BookingStep } from "./booking";
import {
  buildFlightSearchParams,
  createFlightSearchSchema,
  parseFlightSearchParams,
  type FlightSearchValues,
} from "./flight-search";

/**
 * Luồng đặt vé máy bay: kết quả tìm ở `/flights?…` (chọn chuyến đi, rồi chuyến về nếu khứ hồi) → trang đặt vé 2 bước
 * `/flights/book?…&out&ret&step`. Lượt tìm (điểm đi/đến, ngày, hành khách, hạng ghế) và chuyến đã chọn đều nằm trên URL;
 * thông tin hành khách thì KHÔNG.
 */

const first = (value: unknown) => (Array.isArray(value) ? value[0] : value);
const scheduleId = z.preprocess(first, z.coerce.number().int().positive().optional().catch(undefined));

/** Chuyến đã chọn trên URL: `out` = id lịch bay chiều đi, `ret` = chiều về (chỉ khi khứ hồi). */
export interface FlightSelection {
  out?: number;
  ret?: number;
}

const selectionParamsSchema = z.object({
  out: scheduleId,
  ret: scheduleId,
  step: z.preprocess(
    first,
    z.enum(BOOKING_STEPS.map((s) => s.value) as [BookingStep, ...BookingStep[]]).catch(DEFAULT_BOOKING_STEP),
  ),
});

export interface FlightBookingParams {
  /** `null` khi lượt tìm trên URL thiếu/sai. */
  search: FlightSearchValues | null;
  selection: FlightSelection;
  step: BookingStep;
}

/** Đọc URL của trang kết quả / trang đặt vé. Giá trị rác rơi về mặc định, không làm trang lỗi. */
export function parseFlightBookingParams(
  raw: Record<string, string | string[] | undefined>,
  today?: string,
): FlightBookingParams {
  const search = parseFlightSearchParams(raw, today);
  const { out, ret, step } = selectionParamsSchema.parse(raw);
  // Một chiều thì không có chiều về, dù URL còn sót `ret`.
  return { search, selection: { out, ret: search?.tripType === "roundTrip" ? ret : undefined }, step };
}

function buildSelectionSearch(search: FlightSearchValues, selection: FlightSelection, step?: BookingStep): string {
  const params = buildFlightSearchParams(search);
  if (selection.out) params.set("out", String(selection.out));
  if (selection.ret && search.tripType === "roundTrip") params.set("ret", String(selection.ret));
  if (step && step !== DEFAULT_BOOKING_STEP) params.set("step", step);
  return params.toString();
}

/** Trang kết quả (`/flights?…`), kèm chuyến đi đã chọn nếu có. */
export function buildFlightResultsHref(search: FlightSearchValues, selection: FlightSelection = {}): string {
  return `/flights?${buildSelectionSearch(search, selection)}`;
}

/** Trang đặt vé. */
export function buildFlightBookingHref(
  search: FlightSearchValues,
  selection: FlightSelection,
  step?: BookingStep,
): string {
  return `/flights/book?${buildSelectionSearch(search, selection, step)}`;
}

/** Chuỗi query (không có `?`) của trang đặt vé — dùng khi wizard đổi bước bằng `history.pushState`. */
export function buildFlightBookingSearch(search: FlightSearchValues, selection: FlightSelection, step: BookingStep) {
  return buildSelectionSearch(search, selection, step);
}

/** Đủ chuyến để sang trang đặt vé: có chiều đi; khứ hồi thì có cả chiều về. */
export function isFlightSelectionComplete(search: FlightSearchValues, selection: FlightSelection): boolean {
  return Boolean(selection.out) && (search.tripType === "oneWay" || Boolean(selection.ret));
}

const SELECTION_MESSAGE = "Vui lòng chọn chuyến bay.";
const selectionShape = {
  outboundId: z.number({ error: SELECTION_MESSAGE }).int().positive(SELECTION_MESSAGE),
  /** 0 = một chiều. */
  returnId: z.number({ error: SELECTION_MESSAGE }).int().nonnegative(),
};

/** Kiểm chéo lượt tìm ↔ chuyến đã chọn: khứ hồi bắt buộc có chiều về. */
function checkSelection(value: { search: FlightSearchValues; returnId: number }, ctx: z.RefinementCtx) {
  if (value.search.tripType === "roundTrip" && value.returnId === 0) {
    ctx.addIssue({ code: "custom", path: ["returnId"], message: "Vui lòng chọn chuyến về." });
  }
}

/** Dữ liệu nút "Chọn" ở trang kết quả gửi lên `startFlightBookingAction`. */
export function createStartFlightBookingSchema(today: string = getTodayInVietnam()) {
  return z
    .object({ search: createFlightSearchSchema(today), ...selectionShape })
    .superRefine(checkSelection);
}

// ---------------------------------------------------------------------------
// Hành khách
// ---------------------------------------------------------------------------

/** Tuổi hợp lệ VÀO NGÀY BAY CHIỀU ĐI (cách các hãng bay nội địa phân loại hành khách). */
const AGE_RULES: Record<PassengerType, { min: number; max: number | null; message: string }> = {
  adult: { min: 12, max: null, message: "Người lớn phải từ 12 tuổi trở lên vào ngày bay." },
  child: { min: 2, max: 11, message: "Trẻ em phải từ 2 đến dưới 12 tuổi vào ngày bay." },
  infant: { min: 0, max: 1, message: "Em bé phải dưới 2 tuổi vào ngày bay." },
};

const passengerSchema = z.object({
  type: z.enum(["adult", "child", "infant"]),
  fullName: personNameSchema("Vui lòng nhập họ tên hành khách (như trên giấy tờ tuỳ thân)."),
  /** "" = không nhập (chỉ người lớn được bỏ trống). */
  dateOfBirth: z.string().refine((value) => value === "" || isIsoDate(value), "Ngày sinh chưa đúng định dạng."),
});

export type FlightPassengerValues = z.input<typeof passengerSchema>;

/**
 * Luật từng hành khách: trẻ em và em bé bắt buộc có ngày sinh (để kiểm tuổi); ngày sinh không sau hôm nay; tuổi vào ngày
 * bay phải khớp loại hành khách. Lỗi gắn đúng ô `passengers.<i>.dateOfBirth`.
 */
function checkPassengers(
  passengers: FlightPassengerValues[],
  departDate: string,
  today: string,
  ctx: z.RefinementCtx,
  pathPrefix: PropertyKey[] = [],
) {
  passengers.forEach((passenger, index) => {
    const path = [...pathPrefix, "passengers", index, "dateOfBirth"];
    const dob = passenger.dateOfBirth;
    if (dob === "") {
      if (passenger.type !== "adult") {
        ctx.addIssue({ code: "custom", path, message: "Vui lòng nhập ngày sinh để kiểm tra độ tuổi." });
      }
      return;
    }
    if (!isIsoDate(dob)) return; // lỗi định dạng đã báo ở trường
    if (dob > today) {
      ctx.addIssue({ code: "custom", path, message: "Ngày sinh không được sau hôm nay." });
      return;
    }
    if (!isIsoDate(departDate)) return;
    const age = ageInYears(dob, departDate);
    const rule = AGE_RULES[passenger.type];
    if (age < rule.min || (rule.max !== null && age > rule.max)) {
      ctx.addIssue({ code: "custom", path, message: rule.message });
    }
  });
}

/** Thứ tự hành khách trong form: người lớn, trẻ em, rồi em bé — đúng số lượng của lượt tìm. */
export function passengerTypesFor(counts: { adults: number; children: number; infants: number }): PassengerType[] {
  return [
    ...Array<PassengerType>(counts.adults).fill("adult"),
    ...Array<PassengerType>(counts.children).fill("child"),
    ...Array<PassengerType>(counts.infants).fill("infant"),
  ];
}

const flightBookingFormShape = {
  contact: contactSchema,
  passengers: z.array(passengerSchema).min(1).max(9),
  note: noteSchema,
};

/**
 * Form bước "Thông tin" của trang đặt vé. Là hàm nhận ngày bay (tuổi tính theo ngày bay) và `today` (ngày sinh không
 * sau hôm nay; lấy lúc validate).
 */
export function createFlightBookingFormSchema(departDate: string, today: string = getTodayInVietnam()) {
  return z
    .object(flightBookingFormShape)
    .superRefine((value, ctx) => checkPassengers(value.passengers, departDate, today, ctx));
}

export type FlightBookingFormValues = z.input<ReturnType<typeof createFlightBookingFormSchema>>;

const PASSENGER_COUNT_MESSAGE = "Danh sách hành khách không khớp số hành khách đã tìm.";

/**
 * Dữ liệu `createFlightBookingAction` nhận: lượt tìm + chuyến đã chọn + form. Server kiểm lại tất cả (kể cả số hành
 * khách từng loại phải đúng như lượt tìm) và tự tính giá — không có trường giá.
 */
export function createFlightBookingRequestSchema(today: string = getTodayInVietnam()) {
  return z
    .object({ search: createFlightSearchSchema(today), ...selectionShape, ...flightBookingFormShape })
    .superRefine((value, ctx) => {
      checkSelection(value, ctx);
      const expected = passengerTypesFor(value.search);
      const actual = value.passengers.map((p) => p.type);
      if (expected.length !== actual.length || expected.some((type, i) => type !== actual[i])) {
        ctx.addIssue({ code: "custom", path: ["passengers"], message: PASSENGER_COUNT_MESSAGE });
        return;
      }
      checkPassengers(value.passengers, value.search.departDate, today, ctx);
    });
}

export type FlightBookingRequest = z.output<ReturnType<typeof createFlightBookingRequestSchema>>;
