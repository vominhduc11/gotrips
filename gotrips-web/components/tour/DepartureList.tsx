import { Badge } from "@/components/ui/badge";
import { formatDate, formatSeatsLeft, formatVND } from "@/lib/format";
import type { TourDepartureView } from "@/lib/types";
import { SelectDepartureButton } from "./SelectDepartureButton";

/**
 * Lịch khởi hành của một tour. Dùng danh sách (không phải bảng) để xếp lại gọn trên màn hình hẹp.
 * Chuyến đã đầy vẫn hiện để khách thấy lịch, nhưng mờ đi và ghi rõ "Hết chỗ".
 * Chuyến còn chỗ có nút "Chọn ngày này": chọn chuyến đó trong thẻ "Đặt tour" (cần nằm trong `TourBookingProvider`).
 */
export function DepartureList({ departures }: { departures: TourDepartureView[] }) {
  if (departures.length === 0) {
    return (
      <p className="rounded-card bg-surface-muted p-6 text-ink-muted">
        Tour này hiện chưa có ngày khởi hành mới. Vui lòng quay lại sau.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
      {departures.map((departure) => (
        <li
          key={departure.id}
          className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 p-4 sm:px-5"
        >
          <div className={departure.isSoldOut ? "text-ink-muted" : undefined}>
            <p className="font-semibold text-ink">
              <time dateTime={departure.departureDate}>{formatDate(departure.departureDate)}</time>
            </p>
            <p className={departure.isSoldOut || departure.isAlmostFull ? "mt-1 text-sm font-semibold" : "mt-1 text-sm"}>
              <span className={departure.isAlmostFull ? "text-danger-700" : undefined}>{formatSeatsLeft(departure)}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 text-right">
            {departure.discountPercent !== null ? (
              <Badge variant="discount">Giảm {departure.discountPercent}%</Badge>
            ) : null}
            <div>
              {departure.originalPrice !== null ? (
                <del className="block text-sm text-ink-muted">
                  <span className="sr-only">Giá gốc </span>
                  {formatVND(departure.originalPrice)}
                </del>
              ) : null}
              <p
                className={
                  departure.isSoldOut ? "text-lg font-bold text-ink-muted" : "text-lg font-extrabold text-accent-700"
                }
              >
                {formatVND(departure.price)}
                <span className="text-sm font-medium text-ink-muted">/khách</span>
              </p>
            </div>
            {departure.isSoldOut ? null : (
              <SelectDepartureButton departureId={departure.id} dateLabel={formatDate(departure.departureDate)} />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
