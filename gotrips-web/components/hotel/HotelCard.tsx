import { MapPin, Search, Star } from "lucide-react";
import { AppLink } from "@/components/common/AppLink";
import { CoverImage } from "@/components/common/CoverImage";
import { StarRating } from "@/components/common/StarRating";
import { serviceTabHref } from "@/components/home/service-tab-hash";
import { Button } from "@/components/ui/button";
import { formatRating, formatVND } from "@/lib/format";
import type { HotelSearchPrefill } from "@/lib/schemas/hotel-search";
import type { HotelCardView } from "@/lib/types";

/**
 * Thẻ khách sạn ở Trang chủ (bản THỬ NGHIỆM: chưa có trang khách sạn, chưa đặt phòng được).
 * Bấm thẻ KHÔNG dẫn tới trang khách sạn mà đưa khách về ô tìm kiếm ở đầu Trang chủ: mở tab Khách sạn và điền sẵn
 * ô "Điểm đến" bằng điểm đến của khách sạn (`hashPayload`, xem `lib/hash-navigation.ts` và `use-search-prefill.ts`).
 * Vì vậy nút ghi "Tìm khách sạn ở …" chứ không ghi "Đặt phòng", và giá ghi "Giá từ … / đêm".
 *
 * Kiểu thẻ đồng bộ `TourCard`: cả thẻ bấm được qua MỘT liên kết (`after:absolute after:inset-0` phủ kín thẻ) → chỉ
 * một điểm dừng Tab cho mỗi khách sạn.
 */
export function HotelCard({ hotel }: { hotel: HotelCardView }) {
  // Gói điền sẵn: chỉ điểm đến. Ngày, số khách, số phòng để khách tự nhập.
  const prefill: HotelSearchPrefill = { destination: hotel.destinationSlug };

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card bg-surface shadow-card transition-shadow hover:shadow-card-hover">
      <div className="relative aspect-4/3">
        <CoverImage
          src={hotel.imageUrl}
          alt={hotel.imageAlt}
          sizes="(min-width: 1280px) 300px, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          imageClassName="transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
        />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-primary-800">
          <MapPin aria-hidden="true" className="size-4 shrink-0" />
          <span className="min-w-0 truncate">{hotel.destinationName}</span>
        </p>
        <h3 className="mt-1 line-clamp-2 min-h-14 text-lg font-bold leading-7 text-ink">{hotel.name}</h3>
        <p className="mt-1 truncate text-sm text-ink-muted">{hotel.area}</p>

        <div className="mt-2">
          <StarRating rating={hotel.starRating} label={`Khách sạn ${hotel.starRating} sao`} />
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-muted">
          <Star aria-hidden="true" fill="currentColor" stroke="none" className="size-4 text-star" />
          <span className="font-semibold text-ink">{formatRating(hotel.rating)}</span>
          <span>({hotel.reviewCount.toLocaleString("vi-VN")} đánh giá)</span>
        </p>

        {/* Giá ở trên, nút full-width ở dưới (giống TourCard): thẻ chỉ ~290px ở lưới 4 cột nên xếp ngang sẽ chen giá. */}
        <div className="mt-auto pt-4">
          <div className="min-w-0 border-t border-line pt-4">
            <p className="text-xs text-ink-muted">Giá từ</p>
            <p className="text-xl font-extrabold leading-7 text-accent-700">
              {formatVND(hotel.minPricePerNight)}
              <span className="text-sm font-medium text-ink-muted"> / đêm</span>
            </p>
          </div>

          <Button asChild variant="outline" size="md" className="mt-3 w-full after:absolute after:inset-0">
            <AppLink
              href={serviceTabHref("hotel")}
              hashPayload={prefill}
              // Nhiều khách sạn cùng điểm đến nên chữ trên nút trùng nhau: thêm tên khách sạn cho trình đọc màn hình.
              aria-label={`Tìm khách sạn ở ${hotel.destinationName} (gợi ý từ ${hotel.name})`}
            >
              <Search aria-hidden="true" className="size-5" />
              Tìm khách sạn ở {hotel.destinationName}
            </AppLink>
          </Button>
        </div>
      </div>
    </article>
  );
}
