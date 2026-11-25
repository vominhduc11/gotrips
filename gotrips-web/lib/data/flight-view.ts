import { formatVND } from "@/lib/format";
import type {
  Airline,
  Airport,
  CabinClassValue,
  FlightFares,
  FlightOptionView,
  FlightRoute,
  FlightSchedule,
  PassengerType,
} from "@/lib/types";

/**
 * Logic thuần của vé máy bay: giá theo hạng ghế và loại hành khách, giờ hạ cánh, chuyến bay theo ngày (không đụng
 * cache/mock nên kiểm thử được bằng Vitest). `lib/data/flights.ts` chỉ lo lấy dữ liệu + cache rồi gọi vào đây.
 */

/** Hệ số giá so với hạng Phổ thông. */
export const CABIN_FARE_MULTIPLIER: Record<CabinClassValue, number> = {
  economy: 1,
  premiumEconomy: 1.6,
  business: 2.8,
  first: 4.2,
};

/** Trẻ em (2 – dưới 12 tuổi) trả 75% giá người lớn; em bé (dưới 2 tuổi, ngồi cùng người lớn) trả 10%. */
export const PASSENGER_FARE_RATIO: Record<PassengerType, number> = { adult: 1, child: 0.75, infant: 0.1 };

export const PASSENGER_TYPE_LABEL: Record<PassengerType, string> = {
  adult: "Người lớn",
  child: "Trẻ em",
  infant: "Em bé",
};

/** Làm tròn tới nghìn đồng (giá vé không có số lẻ dưới 1.000 ₫). */
function roundToThousand(amount: number): number {
  return Math.round(amount / 1000) * 1000;
}

/** Giá vé một hành khách mỗi loại, cho một chặng ở hạng ghế `cabin`. */
export function computeFares(economyFare: number, cabin: CabinClassValue): FlightFares {
  const adult = roundToThousand(economyFare * CABIN_FARE_MULTIPLIER[cabin]);
  return {
    adult,
    child: roundToThousand(adult * PASSENGER_FARE_RATIO.child),
    infant: roundToThousand(adult * PASSENGER_FARE_RATIO.infant),
  };
}

export interface PassengerCounts {
  adults: number;
  children: number;
  infants: number;
}

/** Đếm hành khách theo loại. */
export function countPassengers(passengers: { type: PassengerType }[]): PassengerCounts {
  return {
    adults: passengers.filter((p) => p.type === "adult").length,
    children: passengers.filter((p) => p.type === "child").length,
    infants: passengers.filter((p) => p.type === "infant").length,
  };
}

/** "2 người lớn, 1 trẻ em, 1 em bé" (bỏ nhóm bằng 0). Dùng ở ô "Hành khách" của form tìm vé, kết quả và đơn. */
export function summarizePassengers(adults: number, children: number, infants: number): string {
  return [`${adults} người lớn`, children > 0 && `${children} trẻ em`, infants > 0 && `${infants} em bé`]
    .filter(Boolean)
    .join(", ");
}

/** Tiền vé một chặng cho cả đoàn. */
export function computeSegmentTotal(fares: FlightFares, counts: PassengerCounts): number {
  return fares.adult * counts.adults + fares.child * counts.children + fares.infant * counts.infants;
}

/** Tổng tiền đơn vé = cộng các chặng (đi, về). Một chỗ tính duy nhất cho thẻ tóm tắt và Server Action. */
export function computeFlightTotal(segments: { fares: FlightFares }[], counts: PassengerCounts): number {
  return segments.reduce((sum, segment) => sum + computeSegmentTotal(segment.fares, counts), 0);
}

/** Nhãn chặng theo thứ tự trong đơn. */
export const SEGMENT_LABELS = ["Chiều đi", "Chiều về"] as const;

/**
 * Các dòng tính tiền của vé: mỗi chặng × mỗi loại hành khách có mặt, ví dụ "Chiều đi: 1.490.000 ₫ × 2 người lớn".
 * Dùng chung cho thẻ tóm tắt trang đặt vé và khối "Thanh toán" của trang đơn.
 */
export function buildFareLines(
  segments: { fares: FlightFares }[],
  counts: PassengerCounts,
): { label: string; amount: number }[] {
  const groups = [
    ["adult", counts.adults],
    ["child", counts.children],
    ["infant", counts.infants],
  ] as const;
  return segments.flatMap((segment, index) =>
    groups
      .filter(([, count]) => count > 0)
      .map(([type, count]) => ({
        label: `${SEGMENT_LABELS[index] ?? "Chặng"}: ${formatVND(segment.fares[type])} × ${count} ${PASSENGER_TYPE_LABEL[type].toLowerCase()}`,
        amount: segment.fares[type] * count,
      })),
  );
}

/** "22:30" + 130 phút → { time: "00:40", nextDay: true }. Chỉ cộng trong vòng 24 giờ (đủ cho chuyến nội địa). */
export function addMinutesToTime(time: string, minutes: number): { time: string; nextDay: boolean } {
  const [hours = 0, mins = 0] = time.split(":").map(Number);
  const total = hours * 60 + mins + minutes;
  const inDay = ((total % 1440) + 1440) % 1440;
  const pad = (value: number) => String(value).padStart(2, "0");
  return { time: `${pad(Math.floor(inDay / 60))}:${pad(inDay % 60)}`, nextDay: total >= 1440 };
}

/** Ghép lịch bay + ngày + hạng ghế thành một chuyến bay cụ thể. `null` nếu thiếu hãng bay hoặc sân bay. */
export function toFlightOptionView(
  schedule: FlightSchedule,
  date: string,
  cabin: CabinClassValue,
  airlines: Airline[],
  airports: Airport[],
): FlightOptionView | null {
  const airline = airlines.find((a) => a.code === schedule.airlineCode);
  const from = airports.find((a) => a.code === schedule.fromCode);
  const to = airports.find((a) => a.code === schedule.toCode);
  if (!airline || !from || !to || from.code === to.code) return null;

  const arrival = addMinutesToTime(schedule.departTime, schedule.durationMinutes);
  return {
    scheduleId: schedule.id,
    airline,
    flightNumber: schedule.flightNumber,
    from,
    to,
    date,
    departTime: schedule.departTime,
    arriveTime: arrival.time,
    arrivesNextDay: arrival.nextDay,
    durationMinutes: schedule.durationMinutes,
    cabin,
    fares: computeFares(schedule.economyFare, cabin),
  };
}

/** Các chuyến bay `from → to` trong ngày `date`, sắp theo giờ cất cánh (rồi `id`). Lịch bay chạy mỗi ngày. */
export function findFlightOptions(
  schedules: FlightSchedule[],
  airlines: Airline[],
  airports: Airport[],
  query: { from: string; to: string; date: string; cabin: CabinClassValue },
): FlightOptionView[] {
  return schedules
    .filter((s) => s.fromCode === query.from && s.toCode === query.to)
    .sort((a, b) => a.departTime.localeCompare(b.departTime) || a.id - b.id)
    .flatMap((s) => {
      const view = toFlightOptionView(s, query.date, query.cabin, airlines, airports);
      return view ? [view] : [];
    });
}

/**
 * Một chuyến bay cụ thể theo id lịch bay, chỉ khi đúng chiều `from → to` (id do URL mang tới nên phải kiểm chiều,
 * không thì "chiều về" có thể là một chuyến bay bất kỳ).
 */
export function findFlightOption(
  schedules: FlightSchedule[],
  airlines: Airline[],
  airports: Airport[],
  query: { scheduleId: number; from: string; to: string; date: string; cabin: CabinClassValue },
): FlightOptionView | null {
  const schedule = schedules.find((s) => s.id === query.scheduleId && s.fromCode === query.from && s.toCode === query.to);
  return schedule ? toFlightOptionView(schedule, query.date, query.cabin, airlines, airports) : null;
}

/** Ảnh minh hoạ của chuyến bay: ảnh chặng bay phổ biến cùng điểm đến, không có thì `fallback`. */
export function findRouteImage(
  routes: Pick<FlightRoute, "toCode" | "imageUrl" | "imageAlt">[],
  toCode: string,
  fallback: { imageUrl: string; imageAlt: string },
): { imageUrl: string; imageAlt: string } {
  const route = routes.find((r) => r.toCode === toCode);
  return route ? { imageUrl: route.imageUrl, imageAlt: route.imageAlt } : fallback;
}
