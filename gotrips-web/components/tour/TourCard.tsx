import { AppLink } from "@/components/common/AppLink";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CoverImage } from "@/components/common/CoverImage";
import { Calendar, Clock, Compass, MapPin, Star, Users } from "lucide-react";
import { formatDate, formatDuration, formatRating, formatVND } from "@/lib/format";
import type { TourCardView } from "@/lib/types";

/**
 * Thẻ tour. Cả thẻ bấm được qua MỘT liên kết ("Xem chi tiết", dùng `after:absolute after:inset-0`
 * để phủ kín thẻ) → chỉ một điểm dừng Tab cho mỗi tour.
 */
export function TourCard({ tour }: { tour: TourCardView }) {
  const hasDiscount = tour.discountPercent !== null && tour.originalPriceFrom !== null;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card bg-surface shadow-card transition-shadow hover:shadow-card-hover">
      <div className="relative aspect-4/3">
        <CoverImage
          src={tour.coverImage}
          alt={tour.coverImageAlt}
          sizes="(min-width: 1280px) 300px, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          imageClassName="transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
        />
        {hasDiscount || tour.isAlmostFull ? (
          <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {hasDiscount ? <Badge variant="discount">Giảm {tour.discountPercent}%</Badge> : null}
            {tour.isAlmostFull ? <Badge variant="warning">Sắp hết chỗ</Badge> : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-primary-800">
          <MapPin aria-hidden="true" className="size-4" />
          {tour.destinationName}
        </p>
        <h3 className="mt-1 line-clamp-2 min-h-14 text-lg font-bold leading-7 text-ink">{tour.title}</h3>

        <ul className="mt-3 space-y-1.5 text-sm text-ink-muted">
          <li className="flex items-center gap-2">
            <Clock aria-hidden="true" className="size-4 shrink-0" />
            <span aria-hidden="true">{formatDuration(tour.durationDays, tour.durationNights)}</span>
            <span className="sr-only">
              {tour.durationDays} ngày {tour.durationNights} đêm
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Compass aria-hidden="true" className="size-4 shrink-0" />
            Khởi hành từ {tour.departureCity}
          </li>
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

        <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-muted">
          <Star aria-hidden="true" fill="currentColor" stroke="none" className="size-4 text-star" />
          <span className="font-semibold text-ink">{formatRating(tour.rating)}</span>
          <span>({tour.reviewCount.toLocaleString("vi-VN")} đánh giá)</span>
        </p>

        {/* Giá ở trên, nút full-width ở dưới: thẻ chỉ ~290px ở lưới 4 cột nên xếp ngang sẽ chen/cắt giá. */}
        <div className="mt-auto pt-4">
          <div className="min-w-0 border-t border-line pt-4">
            <p className="text-xs text-ink-muted">Giá từ</p>
            {tour.priceFrom !== null ? (
              <>
                {hasDiscount && tour.originalPriceFrom !== null ? (
                  <del className="block text-sm text-ink-muted">
                    <span className="sr-only">Giá gốc </span>
                    {formatVND(tour.originalPriceFrom)}
                  </del>
                ) : null}
                <p className="text-xl font-extrabold leading-7 text-accent-700">
                  {formatVND(tour.priceFrom)}
                  <span className="text-sm font-medium text-ink-muted">/khách</span>
                </p>
              </>
            ) : (
              <p className="text-base font-bold text-ink-muted">Hết chỗ</p>
            )}
          </div>

          <Button asChild variant="primary" size="md" className="mt-3 w-full after:absolute after:inset-0">
            <AppLink href={`/tours/${tour.slug}`} aria-label={`Xem chi tiết tour ${tour.title}`}>
              Xem chi tiết
            </AppLink>
          </Button>
        </div>
      </div>
    </article>
  );
}
