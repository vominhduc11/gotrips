import { CircleAlert } from "lucide-react";
import { connection } from "next/server";
import { HotelSearchForm } from "@/components/home/HotelSearchForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionUnavailable } from "@/components/common/SectionUnavailable";
import { loadDestinations } from "@/lib/data/catalog-loaders";
import { getHotels, searchHotels } from "@/lib/data/hotels";
import { buildHotelSearchParams, hasHotelSearchParams, parseHotelSearchParams } from "@/lib/schemas/hotel-search";
import { HotelCard } from "./HotelCard";
import { HotelResultCard } from "./HotelResultCard";

/**
 * Phần phụ thuộc URL của trang `/hotels` (trang bọc trong `<Suspense>` để tiêu đề vẫn prerender):
 *  - có lượt tìm hợp lệ (`?destination&checkIn&checkOut&guests&rooms`) → form điền sẵn + danh sách kết quả;
 *  - không có → form trống + khách sạn gợi ý; có tham số nhưng sai (vd ngày đã qua) → thêm dòng báo.
 * Form đặt `key` theo lượt tìm: Next dùng lại component khi chỉ search params đổi, mà form chỉ đọc giá trị lúc mount.
 */
export async function HotelSearchSection({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Luật ngày (đã qua ngày, bay trong hôm nay...) cần "hôm nay" theo từng request. `searchParams` thôi chưa đủ để Next
  // ngừng prerender (partial prefetching), nên chặn rõ bằng `connection()` trước khi đọc giờ hiện tại.
  await connection();
  const raw = await searchParams;
  const query = parseHotelSearchParams(raw);
  const destinations = await loadDestinations();
  const formKey = query ? buildHotelSearchParams(query).toString() : "trong";

  return (
    <>
      {destinations.ok ? (
        <div className="mt-8 rounded-card bg-surface p-4 shadow-card sm:p-6">
          <HotelSearchForm
            key={formKey}
            // Chỉ truyền xuống client những trường form cần.
            destinations={destinations.data.map(({ slug, name, region }) => ({ slug, name, region }))}
            initialValues={query ?? undefined}
          />
        </div>
      ) : (
        // Điểm đến (từ gotrips-api) là dữ liệu của ô chọn: không có thì form không dùng được, hiện thông báo thay cho form;
        // phần kết quả/gợi ý bên dưới (chưa nối API) vẫn hiện.
        <SectionUnavailable what="ô tìm khách sạn" className="mt-8 bg-surface shadow-card" />
      )}

      {query ? (
        <HotelResults query={query} />
      ) : (
        <HotelSuggestions invalidSearch={hasHotelSearchParams(raw)} />
      )}
    </>
  );
}

async function HotelResults({ query }: { query: NonNullable<ReturnType<typeof parseHotelSearchParams>> }) {
  const { destinationName, items } = await searchHotels(query);

  return (
    <section aria-labelledby="ket-qua-khach-san-heading" className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="ket-qua-khach-san-heading" className="text-2xl font-bold tracking-tight text-ink">
          Khách sạn ở {destinationName ?? "điểm đến đã chọn"}
        </h2>
        {/* role="status": đọc lại số kết quả cho người dùng trình đọc màn hình sau mỗi lượt tìm. */}
        <p role="status" className="text-sm text-ink-muted">
          {items.length > 0 ? `${items.length} khách sạn còn phòng phù hợp` : "Không có khách sạn phù hợp"}
        </p>
      </div>

      {items.length > 0 ? (
        <ul className="mt-6 space-y-4">
          {items.map((hotel) => (
            <li key={hotel.id}>
              <HotelResultCard hotel={hotel} checkIn={query.checkIn} checkOut={query.checkOut} guests={query.guests} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-6 rounded-card bg-surface p-8 text-center shadow-card">
          <p className="text-lg font-bold text-ink">Chưa tìm thấy khách sạn phù hợp</p>
          <p className="mt-2 text-ink-muted">
            Hãy thử tăng số phòng, giảm số khách hoặc chọn điểm đến khác.
          </p>
        </div>
      )}
    </section>
  );
}

async function HotelSuggestions({ invalidSearch }: { invalidSearch: boolean }) {
  const hotels = await getHotels();

  return (
    <section aria-labelledby="ds-khach-san-heading" className="mt-12">
      {invalidSearch ? (
        <Alert className="mb-8 border-accent-200 bg-accent-50 text-accent-800">
          <CircleAlert aria-hidden="true" />
          <AlertDescription className="text-accent-800">
            Thông tin tìm kiếm chưa đầy đủ hoặc ngày nhận phòng đã qua. Bạn vui lòng chọn lại ở ô tìm kiếm phía trên.
          </AlertDescription>
        </Alert>
      ) : null}
      <h2 id="ds-khach-san-heading" className="text-2xl font-bold tracking-tight text-ink">
        Khách sạn gợi ý
      </h2>
      <p className="mt-2 max-w-2xl text-base leading-7 text-ink-muted">
        Chọn ngày và số khách ở ô tìm kiếm để xem giá cả kỳ lưu trú, hoặc mở một khách sạn để xem các loại phòng.
      </p>

      {hotels.length > 0 ? (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {hotels.map((hotel) => (
            <li key={hotel.id}>
              <HotelCard hotel={hotel} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 rounded-card bg-surface-muted p-8 text-center text-ink-muted">
          Hiện chưa có khách sạn nào để gợi ý. Vui lòng quay lại sau.
        </p>
      )}
    </section>
  );
}

/** Khung chờ khi đang đọc `searchParams`; giữ chiều cao gần đúng để trang không giật. */
export function HotelSearchSectionSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton className="mt-8 h-40 w-full rounded-card sm:h-28" />
      <Skeleton className="mt-12 h-8 w-56" />
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-96 rounded-card" />
        ))}
      </div>
    </div>
  );
}
