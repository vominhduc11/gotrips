import { computeBookingTotal } from "@/lib/data/booking-view";
import { formatVND } from "@/lib/format";

/**
 * Tiền TẠM TÍNH của một lựa chọn chuyến: giá mỗi khách × số khách. Dùng ở thẻ "Đặt tour", hộp thoại "Thay đổi" và thẻ
 * tóm tắt của trang đặt tour. Tổng tiền thật do server tính lại lúc tạo đơn (không tin số ở trình duyệt).
 */
export function TripPriceBreakdown({ price, guests }: { price: number; guests: number }) {
  const total = computeBookingTotal(price, guests);

  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between gap-4">
        <dt className="text-ink-muted">
          {formatVND(price)} × {guests} khách
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
