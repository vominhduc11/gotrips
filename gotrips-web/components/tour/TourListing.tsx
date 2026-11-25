import { AppLink } from "@/components/common/AppLink";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TourCard } from "@/components/tour/TourCard";
import { TourFilterBar } from "@/components/tour/TourFilterBar";
import { TourPagination } from "@/components/tour/TourPagination";
import { loadDestinations } from "@/lib/data/catalog-loaders";
import { searchTours } from "@/lib/data/tours";
import { parseTourFilters } from "@/lib/schemas/tour-filters";

/**
 * Phần phụ thuộc URL của trang /tours. `searchParams` chỉ được `await` ở đây (bên trong `<Suspense>` của
 * page) để phần tiêu đề vẫn nằm trong static shell — xem "Maximizing the static shell" trong docs Next.
 */
export async function TourListing({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseTourFilters(await searchParams);
  const [destinationList, result] = await Promise.all([loadDestinations(), searchTours(filters)]);
  // Danh sách điểm đến (từ gotrips-api) chỉ để dựng ô lọc. API lỗi thì ô lọc thiếu lựa chọn điểm đến nhưng danh sách tour
  // và các bộ lọc khác vẫn dùng được, nên không để cả trang vỡ (lỗi đã được ghi log trong `loadSection`).
  const destinations = destinationList.ok ? destinationList.data : [];

  const heading = result.destination ? `Tour ${result.destination.name}` : "Tất cả tour";
  const hasFilters = Boolean(filters.destination || filters.q || filters.date || filters.guests);

  return (
    <div className="space-y-6">
      <TourFilterBar filters={filters} destinations={destinations} />

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-bold text-ink">{heading}</h2>
        {/* role="status": đọc lại số kết quả cho người dùng trình đọc màn hình khi bộ lọc đổi. */}
        <p role="status" className="text-sm text-ink-muted">
          {result.total > 0 ? `${result.total.toLocaleString("vi-VN")} tour` : "Không có tour nào"}
        </p>
      </div>

      {result.items.length > 0 ? (
        <>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {result.items.map((tour) => (
              <li key={tour.id}>
                <TourCard tour={tour} />
              </li>
            ))}
          </ul>
          <TourPagination filters={filters} page={result.page} pageCount={result.pageCount} />
        </>
      ) : (
        <div className="rounded-card bg-surface p-8 text-center shadow-card">
          <p className="text-lg font-bold text-ink">Chưa tìm thấy tour phù hợp</p>
          <p className="mt-2 text-ink-muted">
            {hasFilters
              ? "Hãy thử bỏ bớt bộ lọc, đổi ngày khởi hành hoặc giảm số khách."
              : "Hiện chưa có tour nào đang mở bán. Vui lòng quay lại sau."}
          </p>
          {hasFilters ? (
            <Button asChild variant="outline" size="md" className="mt-5">
              <AppLink href="/tours">Xem tất cả tour</AppLink>
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}

/** Khung chờ khi đang đọc `searchParams`/dữ liệu; giữ chiều cao gần đúng để trang không giật. */
export function TourListingSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-6">
      <Skeleton className="h-10 w-full max-w-xl" />
      <Skeleton className="h-7 w-48" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-96 rounded-card" />
        ))}
      </div>
    </div>
  );
}
