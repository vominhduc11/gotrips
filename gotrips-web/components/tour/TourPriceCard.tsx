import { Calendar, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatVND } from "@/lib/format";
import type { TourDetailView } from "@/lib/types";

/**
 * Thẻ giá bên phải trang chi tiết (dính khi cuộn ở màn hình rộng).
 * Chưa có luồng đặt tour nên nút "Đặt tour" tạm khoá kèm lời giải thích; khi có trang booking thì đổi thành
 * liên kết (`<Button asChild><AppLink href=...>`), bước booking lưu trong URL search params.
 */
export function TourPriceCard({ tour }: { tour: TourDetailView }) {
  const hasDiscount = tour.discountPercent !== null && tour.originalPriceFrom !== null;

  return (
    <aside
      aria-label="Giá và đặt tour"
      className="rounded-card bg-surface p-5 shadow-card lg:sticky lg:top-24"
    >
      <p className="text-sm text-ink-muted">Giá từ</p>
      {tour.priceFrom !== null ? (
        <>
          {hasDiscount && tour.originalPriceFrom !== null ? (
            <div className="mt-1 flex items-center gap-2">
              <del className="text-sm text-ink-muted">
                <span className="sr-only">Giá gốc </span>
                {formatVND(tour.originalPriceFrom)}
              </del>
              <Badge variant="discount">Giảm {tour.discountPercent}%</Badge>
            </div>
          ) : null}
          <p className="text-3xl font-extrabold leading-9 text-accent-700">
            {formatVND(tour.priceFrom)}
            <span className="text-base font-medium text-ink-muted">/khách</span>
          </p>
        </>
      ) : (
        <p className="text-2xl font-bold text-ink-muted">Hết chỗ</p>
      )}

      <ul className="mt-4 space-y-2 border-t border-line pt-4 text-sm text-ink-muted">
        <li className="flex items-center gap-2">
          <Calendar aria-hidden="true" className="size-4 shrink-0" />
          {tour.nextDepartureDate ? (
            <span>
              Ngày đi gần nhất: <time dateTime={tour.nextDepartureDate}>{formatDate(tour.nextDepartureDate)}</time>
            </span>
          ) : (
            <span>Chưa có ngày khởi hành</span>
          )}
        </li>
        {tour.isAlmostFull && tour.seatsLeft !== null ? (
          <li className="flex items-center gap-2 font-semibold text-danger-700">
            <Users aria-hidden="true" className="size-4 shrink-0" />
            Chỉ còn {tour.seatsLeft} chỗ
          </li>
        ) : null}
      </ul>

      <Button disabled size="lg" className="mt-5 w-full" aria-describedby="ghi-chu-dat-tour">
        Đặt tour
      </Button>
      <p id="ghi-chu-dat-tour" className="mt-2 text-center text-sm text-ink-muted">
        Tính năng đặt tour trực tuyến sắp ra mắt.
      </p>
    </aside>
  );
}
