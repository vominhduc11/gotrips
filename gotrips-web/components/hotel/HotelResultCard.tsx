import { BedDouble, MapPin, Star, Users } from "lucide-react";
import { AppLink } from "@/components/common/AppLink";
import { CoverImage } from "@/components/common/CoverImage";
import { StarRating } from "@/components/common/StarRating";
import { Button } from "@/components/ui/button";
import { formatRating, formatVND } from "@/lib/format";
import { buildHotelDetailHref } from "@/lib/schemas/hotel-booking";
import type { HotelSearchResultView } from "@/lib/types";

/**
 * Một khách sạn trong kết quả tìm kiếm ở `/hotels?…`: phòng rẻ nhất chứa đủ khách và TỔNG tiền cho cả kỳ lưu trú.
 * Bấm thẻ mở trang chi tiết với lựa chọn (phòng, ngày, khách, số phòng) điền sẵn vào thẻ "Đặt phòng".
 * Cả thẻ bấm được qua MỘT liên kết (`after:absolute after:inset-0`), như `TourCard`.
 */
export function HotelResultCard({
  hotel,
  checkIn,
  checkOut,
  guests,
}: {
  hotel: HotelSearchResultView;
  checkIn: string;
  checkOut: string;
  guests: number;
}) {
  const href = buildHotelDetailHref(
    hotel.slug,
    { room: hotel.room.id, checkIn, checkOut, guests, rooms: hotel.rooms },
    { scrollToCard: false },
  );

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-card bg-surface shadow-card transition-shadow hover:shadow-card-hover sm:flex-row">
      <div className="relative aspect-16/9 shrink-0 sm:aspect-auto sm:w-64">
        <CoverImage
          src={hotel.imageUrl}
          alt={hotel.imageAlt}
          sizes="(min-width: 640px) 256px, 100vw"
          imageClassName="transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 sm:p-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-primary-800">
            <MapPin aria-hidden="true" className="size-4 shrink-0" />
            <span className="min-w-0 truncate">{hotel.area}</span>
          </p>
          <h3 className="mt-1 text-lg font-bold leading-7 text-ink">{hotel.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <StarRating rating={hotel.starRating} label={`Khách sạn ${hotel.starRating} sao`} />
            <p className="flex items-center gap-1.5 text-sm text-ink-muted">
              <Star aria-hidden="true" fill="currentColor" stroke="none" className="size-4 text-star" />
              <span className="font-semibold text-ink">{formatRating(hotel.rating)}</span>
              <span>({hotel.reviewCount.toLocaleString("vi-VN")} đánh giá)</span>
            </p>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-ink">
            <li className="flex items-center gap-2">
              <BedDouble aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
              {hotel.rooms} × {hotel.room.name} · {hotel.room.bedType}
            </li>
            <li className="flex items-center gap-2">
              <Users aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
              Tối đa {hotel.room.maxGuests} khách mỗi phòng
            </li>
          </ul>
        </div>

        <div className="shrink-0 border-t border-line pt-4 md:border-0 md:pt-0 md:text-right">
          <p className="text-xs text-ink-muted">
            {hotel.nights} đêm, {hotel.rooms} phòng, {guests} khách
          </p>
          <p className="text-2xl font-extrabold leading-8 text-accent-700">{formatVND(hotel.totalPrice)}</p>
          <p className="text-xs text-ink-muted">{formatVND(hotel.room.pricePerNight)} / phòng / đêm</p>
          <Button asChild variant="primary" size="md" className="mt-3 w-full after:absolute after:inset-0 md:w-auto">
            <AppLink href={href} aria-label={`Xem phòng ${hotel.name}`}>
              Xem phòng
            </AppLink>
          </Button>
        </div>
      </div>
    </article>
  );
}
