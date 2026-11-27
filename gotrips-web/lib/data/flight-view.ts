import { formatVND } from "@/lib/format";
import type { FlightFares, PassengerType } from "@/lib/types";

/**
 * Hàm thuần phục vụ HIỂN THỊ vé máy bay: nhãn, đếm hành khách, tạm tính từ giá API trả về. Giá theo hạng ghế/loại hành
 * khách, giờ hạ cánh, ghế còn lại do gotrips-api tính; tổng tiền thật cũng do API tính lúc tạo đơn.
 */

export const PASSENGER_TYPE_LABEL: Record<PassengerType, string> = {
  adult: "Người lớn",
  child: "Trẻ em",
  infant: "Em bé",
};

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

/** Tạm tính tiền vé một chặng cho cả đoàn. */
export function computeSegmentTotal(fares: FlightFares, counts: PassengerCounts): number {
  return fares.adult * counts.adults + fares.child * counts.children + fares.infant * counts.infants;
}

/** Tạm tính cả đơn vé = cộng các chặng (đi, về). */
export function computeFlightTotal(segments: { fares: FlightFares }[], counts: PassengerCounts): number {
  return segments.reduce((sum, segment) => sum + computeSegmentTotal(segment.fares, counts), 0);
}

/** Nhãn chặng theo thứ tự trong đơn. */
export const SEGMENT_LABELS = ["Chiều đi", "Chiều về"] as const;

/** Nhãn một dòng tính tiền vé, ví dụ "Chiều đi: 1.490.000 ₫ × 2 người lớn". */
export function fareLineLabel(segmentIndex: number, unitPrice: number, quantity: number, type: PassengerType): string {
  return `${SEGMENT_LABELS[segmentIndex] ?? "Chặng"}: ${formatVND(unitPrice)} × ${quantity} ${PASSENGER_TYPE_LABEL[type].toLowerCase()}`;
}

/** Các dòng TẠM TÍNH của thẻ tóm tắt trang đặt vé: mỗi chặng × mỗi loại hành khách có mặt. */
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
        label: fareLineLabel(index, segment.fares[type], count, type),
        amount: segment.fares[type] * count,
      })),
  );
}
