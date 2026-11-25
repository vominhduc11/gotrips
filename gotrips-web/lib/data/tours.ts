/**
 * Lớp truy cập dữ liệu cho trang /tours và /tours/[slug]. Cùng quy ước với `lib/data/home.ts`: component CHỈ import từ
 * đây; gọi gotrips-api qua client do Orval sinh, giữ các directive `"use cache"` / `cacheLife` / `cacheTag`.
 *
 *  - Lọc, sắp xếp, phân trang và mọi trường suy ra (giá từ, ngày gần nhất, số chỗ, giảm giá...) do API tính; web không tải
 *    lịch khởi hành để tự tính nữa. Response của API khớp kiểu "View" trong `lib/types.ts` nên gán thẳng; TypeScript báo
 *    lỗi nếu API đổi hình dạng.
 *  - `filters` là đối số nên nằm trong khoá cache: mỗi tổ hợp bộ lọc được cache riêng (tối đa 1 giờ). Schema đã giới hạn
 *    độ dài `q`/`page` nên khoá cache không phình vô hạn.
 *  - Hàm KHÔNG bắt lỗi (trừ 404 ở `getTourDetail`, là kết quả hợp lệ): API lỗi thì ném ra và Next không cache kết quả đó.
 *    Nơi gọi dùng `loadSection` để hiện trạng thái lỗi cục bộ và để `next build` không phải gọi API.
 */
import { cacheLife, cacheTag } from "next/cache";
import { getTour, searchTours as searchToursApi } from "@/lib/api/generated";
import { ApiError } from "@/lib/api/http";
import type { TourFilters } from "@/lib/schemas/tour-filters";
import type { TourDetailView, TourSearchResultView } from "@/lib/types";
import { catalogRequestInit } from "./catalog-request";
import { isValidTourSlug, toSearchToursParams } from "./tour-request";

export async function searchTours(filters: TourFilters): Promise<TourSearchResultView> {
  "use cache";
  cacheLife("hours");
  // `destinations` vì kết quả mang tên điểm đến; `departures` vì giá/ngày/số chỗ của thẻ tour đến từ lịch khởi hành.
  cacheTag("tours", "departures", "destinations");

  const { data } = await searchToursApi(toSearchToursParams(filters), catalogRequestInit());
  return data;
}

/** Chi tiết một tour; `null` nếu không có hoặc đang bị ẩn (API trả 404, trang sẽ `notFound()`). */
export async function getTourDetail(slug: string): Promise<TourDetailView | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("tours", "departures", "testimonials");

  // Slug sai định dạng thì không thể có tour nào, và không được ghép vào đường dẫn API (xem `isValidTourSlug`).
  if (!isValidTourSlug(slug)) return null;

  try {
    const { data } = await getTour(slug, catalogRequestInit());
    return data;
  } catch (error) {
    // 404 là kết quả hợp lệ (slug không tồn tại / tour HIDDEN) và được cache như mọi kết quả khác; lỗi còn lại ném tiếp.
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
