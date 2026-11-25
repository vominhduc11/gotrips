import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

/**
 * Khung chờ của các section Trang chủ lấy dữ liệu từ API. Các section này nằm sau `await io()` (xem `loadSection`) nên
 * HTML prerender chỉ có khung chờ, nội dung stream tới ngay sau đó. Chiều cao khớp gần đúng thẻ thật để bố cục không
 * giật khi dữ liệu về. Mọi khung chờ đều `aria-hidden`; chỉ có một dòng "Đang tải" cho trình đọc màn hình.
 */

/** Lưới thẻ chờ. `className` là lưới (cột), `cardClassName` là kích thước mỗi thẻ. */
export function CardGridSkeleton({
  count,
  className,
  cardClassName,
}: {
  count: number;
  className: string;
  cardClassName: string;
}) {
  return (
    <div className="mt-8" aria-busy="true">
      <span role="status" className="sr-only">
        Đang tải…
      </span>
      <ul aria-hidden="true" className={className}>
        {Array.from({ length: count }, (_, index) => (
          <li key={index}>
            <Skeleton className={cn("rounded-card", cardClassName)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Khung chờ của một form trong ô tìm kiếm Hero (nhãn + ô nhập, nút tìm). Cao gần bằng form thật: `fieldCount` ô
 * (tab Tour/Khách sạn: 3 ô, Vé máy bay: 2 hàng nên 4) và một nút.
 */
export function SearchFormSkeleton({ fieldCount = 3 }: { fieldCount?: number }) {
  return (
    <div aria-busy="true">
      <span role="status" className="sr-only">
        Đang tải ô tìm kiếm…
      </span>
      <div aria-hidden="true" className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 lg:items-end">
        {Array.from({ length: fieldCount }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 w-full rounded-control" />
          </div>
        ))}
        <Skeleton className="h-12 w-full rounded-control" />
      </div>
    </div>
  );
}
