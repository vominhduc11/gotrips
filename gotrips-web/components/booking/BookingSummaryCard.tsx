import { Calendar, Clock, MapPin, Pencil, Users } from "lucide-react";
import { CoverImage } from "@/components/common/CoverImage";
import { Button } from "@/components/ui/button";
import { formatDate, formatDuration } from "@/lib/format";
import type { TourDepartureView, TourDetailView } from "@/lib/types";
import { TripPriceBreakdown } from "./TripPriceBreakdown";

/** Phần thông tin tour mà luồng đặt tour cần (gửi sang Client Component nên chỉ lấy đủ dùng). */
export type BookingTour = Pick<
  TourDetailView,
  "slug" | "title" | "destinationName" | "coverImage" | "coverImageAlt" | "durationDays" | "durationNights" | "departureCity"
>;

/**
 * Thẻ tóm tắt bên cạnh form (dính khi cuộn ở màn hình rộng): tour, chuyến đã chọn và tiền TẠM TÍNH.
 * Tổng tiền thật do server tính lại lúc tạo đơn (không tin số ở trình duyệt); ở đây chỉ để khách xem trước.
 * Nút "Thay đổi" mở hộp thoại đổi ngày / số khách (wizard quản lý hộp thoại).
 */
export function BookingSummaryCard({
  tour,
  departure,
  guests,
  onChangeTrip,
}: {
  tour: BookingTour;
  departure: TourDepartureView | null;
  guests: number;
  onChangeTrip?: () => void;
}) {
  return (
    <aside aria-label="Tóm tắt đơn đặt tour" className="rounded-card bg-surface shadow-card lg:sticky lg:top-24">
      <div className="relative aspect-16/9 overflow-hidden rounded-t-card">
        <CoverImage src={tour.coverImage} alt={tour.coverImageAlt} sizes="(min-width: 1024px) 352px, 100vw" />
      </div>
      <div className="p-5">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-primary-800">
          <MapPin aria-hidden="true" className="size-4" />
          {tour.destinationName}
        </p>
        <p className="mt-1 font-bold leading-6 text-ink">{tour.title}</p>

        <ul className="mt-4 space-y-2 border-t border-line pt-4 text-sm text-ink-muted">
          <li className="flex items-center gap-2">
            <Clock aria-hidden="true" className="size-4 shrink-0" />
            {tour.durationDays} ngày {tour.durationNights} đêm ({formatDuration(tour.durationDays, tour.durationNights)}) · từ{" "}
            {tour.departureCity}
          </li>
        </ul>

        <div className="mt-4 flex items-start justify-between gap-3 border-t border-line pt-4">
          <ul className="space-y-2 text-sm text-ink">
            <li className="flex items-center gap-2">
              <Calendar aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
              {departure ? (
                <span>
                  Khởi hành:{" "}
                  <time dateTime={departure.departureDate} className="font-semibold">
                    {formatDate(departure.departureDate)}
                  </time>
                </span>
              ) : (
                <span>Chưa chọn ngày khởi hành</span>
              )}
            </li>
            <li className="flex items-center gap-2">
              <Users aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
              <span className="font-semibold">{guests} khách</span>
            </li>
          </ul>
          {onChangeTrip ? (
            <Button variant="ghost" size="sm" className="-mt-1.5 -mr-2 shrink-0" onClick={onChangeTrip}>
              <Pencil aria-hidden="true" className="size-4" />
              Thay đổi
              <span className="sr-only"> ngày khởi hành hoặc số khách</span>
            </Button>
          ) : null}
        </div>

        {departure ? (
          <div className="mt-4 border-t border-line pt-4">
            <TripPriceBreakdown price={departure.price} guests={guests} />
          </div>
        ) : null}
      </div>
    </aside>
  );
}
