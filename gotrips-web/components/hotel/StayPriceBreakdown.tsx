import { computeStayTotal } from "@/lib/data/hotel-view";
import { formatVND } from "@/lib/format";

/**
 * Tiền phòng TẠM TÍNH: giá một phòng một đêm × số đêm × số phòng. Dùng ở thẻ "Đặt phòng" và thẻ tóm tắt của trang đặt
 * phòng. Tổng tiền thật do server tính lại lúc tạo đơn (không tin số ở trình duyệt).
 */
export function StayPriceBreakdown({
  pricePerNight,
  nights,
  rooms,
}: {
  pricePerNight: number;
  nights: number;
  rooms: number;
}) {
  const total = computeStayTotal(pricePerNight, nights, rooms);

  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between gap-4">
        <dt className="text-ink-muted">
          {formatVND(pricePerNight)} × {nights} đêm × {rooms} phòng
        </dt>
        <dd className="font-medium text-ink">{formatVND(total)}</dd>
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <dt className="font-semibold text-ink">Tạm tính</dt>
        <dd className="text-2xl font-extrabold text-accent-700">{formatVND(total)}</dd>
      </div>
    </dl>
  );
}
