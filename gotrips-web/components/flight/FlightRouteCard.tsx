import { ArrowRight, Clock, PlaneTakeoff, Search } from "lucide-react";
import { AppLink } from "@/components/common/AppLink";
import { CoverImage } from "@/components/common/CoverImage";
import { serviceTabHref } from "@/components/home/service-tab-hash";
import { Button } from "@/components/ui/button";
import { formatFlightDuration, formatVND } from "@/lib/format";
import type { FlightSearchPrefill } from "@/lib/schemas/flight-search";
import type { FlightRouteCardView } from "@/lib/types";

/**
 * Thẻ chặng bay ở Trang chủ (bản THỬ NGHIỆM: chưa có trang chuyến bay, chưa đặt vé được).
 * Bấm thẻ đưa khách về ô tìm kiếm ở đầu Trang chủ: mở tab Vé máy bay và điền sẵn "Điểm đi"/"Điểm đến" bằng mã
 * sân bay của chặng (`hashPayload`, xem `lib/hash-navigation.ts` và `use-search-prefill.ts`); loại hành trình, ngày,
 * hành khách khách đã chọn được giữ nguyên. Vì vậy nút ghi "Tìm chuyến bay …" chứ không ghi "Đặt vé", và giá ghi
 * "Giá tham khảo từ …" (giá minh hoạ, không phải giá bán).
 *
 * Kiểu thẻ đồng bộ `TourCard`: cả thẻ bấm được qua MỘT liên kết (`after:absolute after:inset-0`).
 */
export function FlightRouteCard({ route }: { route: FlightRouteCardView }) {
  const prefill: FlightSearchPrefill = { from: route.from.code, to: route.to.code };

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card bg-surface shadow-card transition-shadow hover:shadow-card-hover">
      <div className="relative aspect-16/9">
        <CoverImage
          src={route.imageUrl}
          alt={route.imageAlt}
          sizes="(min-width: 1280px) 400px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          imageClassName="transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
        />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-primary-800">
          <PlaneTakeoff aria-hidden="true" className="size-4 shrink-0" />
          {route.from.code}
          <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
          {/* Khoảng trắng nằm TRONG sr-only: JSX bỏ khoảng trắng giữa các phần tử xuống dòng, trình đọc màn hình sẽ dính chữ. */}
          <span className="sr-only"> đến </span>
          {route.to.code}
        </p>
        <h3 className="mt-1 text-lg font-bold leading-7 text-ink">
          {route.from.city}
          <ArrowRight aria-hidden="true" className="mx-1.5 inline size-5 align-text-bottom text-ink-muted" />
          <span className="sr-only"> đến </span>
          {route.to.city}
        </h3>

        <p className="mt-3 flex items-center gap-2 text-sm text-ink-muted">
          <Clock aria-hidden="true" className="size-4 shrink-0" />
          Thời gian bay khoảng {formatFlightDuration(route.durationMinutes)}
        </p>

        <div className="mt-auto pt-4">
          <div className="min-w-0 border-t border-line pt-4">
            <p className="text-xs text-ink-muted">Giá tham khảo từ</p>
            <p className="text-xl font-extrabold leading-7 text-accent-700">{formatVND(route.referencePrice)}</p>
          </div>

          <Button asChild variant="outline" size="md" className="mt-3 w-full after:absolute after:inset-0">
            <AppLink href={serviceTabHref("flight")} hashPayload={prefill}>
              <Search aria-hidden="true" className="size-5" />
              Tìm chuyến bay {route.from.code}
              <ArrowRight aria-hidden="true" className="size-4" />
              <span className="sr-only"> đến </span>
              {route.to.code}
            </AppLink>
          </Button>
        </div>
      </div>
    </article>
  );
}
