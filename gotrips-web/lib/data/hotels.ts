/**
 * Lớp truy cập dữ liệu khách sạn: section "Khách sạn nổi bật" ở Trang chủ, trang `/hotels` (gợi ý + kết quả tìm kiếm) và
 * trang chi tiết `/hotels/[slug]`. Cùng quy ước với `lib/data/tours.ts`: component CHỈ import từ `lib/data/*`; gọi
 * gotrips-api qua client do Orval sinh, giữ các directive `"use cache"` / `cacheLife` / `cacheTag`.
 *
 *  - Lọc khách sạn ẩn/chưa có phòng, chọn phòng rẻ nhất đủ chỗ, tổng tiền cả kỳ và thứ tự kết quả do API tính; web không
 *    còn tự tính nữa. Response của API khớp kiểu "View" trong `lib/types.ts` nên gán thẳng; TypeScript báo lỗi nếu API đổi
 *    hình dạng.
 *  - `query` là đối số nên nằm trong khoá cache: mỗi lượt tìm được cache riêng (tối đa 1 giờ).
 *  - Hàm KHÔNG bắt lỗi (trừ 404 ở `getHotelDetail`, là kết quả hợp lệ): API lỗi thì ném ra và Next không cache kết quả đó.
 *    Nơi gọi dùng `loadSection` để hiện trạng thái lỗi cục bộ và để `next build` không phải gọi API.
 */
import { cacheLife, cacheTag } from "next/cache";
import { getHotel, listFeaturedHotels, searchHotels as searchHotelsApi } from "@/lib/api/generated";
import { ApiError } from "@/lib/api/http";
import type { HotelSearchValues } from "@/lib/schemas/hotel-search";
import type { HotelCardView, HotelDetailView, HotelSearchResultView } from "@/lib/types";
import { catalogRequestInit } from "./catalog-request";
import { isValidHotelSlug, toSearchHotelsParams } from "./hotel-request";

/** Số khách sạn tối đa của danh sách gợi ý ở `/hotels` (cũng là giới hạn `limit` của API). */
const HOTEL_LIST_LIMIT = 50;

/**
 * Khách sạn nổi bật cho Trang chủ — lấy từ gotrips-api (đã bỏ khách sạn HIDDEN và khách sạn chưa có loại phòng, sắp theo
 * điểm đánh giá, "giá từ" là giá một đêm thấp nhất). Hàm không bắt lỗi; gọi sau `await io()` (xem `loadSection`).
 */
export async function getFeaturedHotels(limit = 4): Promise<HotelCardView[]> {
  "use cache";
  cacheLife("hours");
  // `destinations` vì thẻ hiện tên điểm đến: đổi tên điểm đến thì danh sách này phải được làm mới theo.
  cacheTag("hotels", "destinations");

  const { data } = await listFeaturedHotels({ limit }, catalogRequestInit());
  return data;
}

/**
 * Mọi khách sạn khách được phép thấy, cho danh sách gợi ý của `/hotels`. Cùng quy tắc lọc/sắp xếp với
 * `getFeaturedHotels` nên dùng chung endpoint với `limit` tối đa (không có endpoint riêng).
 */
export async function getHotels(): Promise<HotelCardView[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("hotels", "destinations");

  const { data } = await listFeaturedHotels({ limit: HOTEL_LIST_LIMIT }, catalogRequestInit());
  return data;
}

/** Chi tiết khách sạn; `null` nếu không có, bị ẩn hoặc không có loại phòng (API trả 404, trang sẽ `notFound()`). */
export async function getHotelDetail(slug: string): Promise<HotelDetailView | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("hotels", "destinations");

  // Slug sai định dạng thì không thể có khách sạn nào, và không được ghép vào đường dẫn API (xem `isValidHotelSlug`).
  if (!isValidHotelSlug(slug)) return null;

  try {
    const { data } = await getHotel(slug, catalogRequestInit());
    return data;
  } catch (error) {
    // 404 là kết quả hợp lệ (slug không tồn tại / khách sạn HIDDEN / chưa có phòng) và được cache như mọi kết quả khác;
    // lỗi còn lại ném tiếp.
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/**
 * Kết quả tìm khách sạn (tham số đã qua `parseHotelSearchParams`). Cache theo bộ tham số; tham số không phụ thuộc
 * thời điểm hiện tại nên kết quả cũng vậy. Điểm đến không tồn tại → `destinationName` là null và danh sách rỗng.
 */
export async function searchHotels(
  query: HotelSearchValues,
): Promise<{ destinationName: string | null; items: HotelSearchResultView[] }> {
  "use cache";
  cacheLife("hours");
  cacheTag("hotels", "destinations");

  const { data } = await searchHotelsApi(toSearchHotelsParams(query), catalogRequestInit());
  return data;
}
