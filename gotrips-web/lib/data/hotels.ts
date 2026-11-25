/**
 * Lớp truy cập dữ liệu khách sạn: section "Khách sạn nổi bật" ở Trang chủ, trang `/hotels` (gợi ý + kết quả tìm kiếm) và
 * trang chi tiết `/hotels/[slug]`.
 * Cùng quy ước với `lib/data/home.ts`: component CHỈ import từ `lib/data/*`; khi nối API thật chỉ đổi thân hàm
 * (fetch + map sang `HotelCardView`), giữ nguyên chữ ký và các directive cache. Logic chọn/ghép nằm ở `hotel-view.ts`
 * (hàm thuần có test).
 */
import { cacheLife, cacheTag } from "next/cache";
import { listFeaturedHotels } from "@/lib/api/generated";
import { destinations } from "@/lib/mock/destinations";
import { hotelRoomTypes } from "@/lib/mock/hotel-room-types";
import { hotels } from "@/lib/mock/hotels";
import type { HotelCardView, HotelDetailView, HotelSearchResultView } from "@/lib/types";
import { catalogRequestInit } from "./catalog-request";
import { findHotelDetail, listHotelSlugs, searchHotels as searchHotelsIn, selectFeaturedHotels, type HotelSearchQuery } from "./hotel-view";

/**
 * Khách sạn nổi bật cho Trang chủ — lấy từ gotrips-api (đã bỏ khách sạn HIDDEN và khách sạn chưa có loại phòng, sắp theo
 * điểm đánh giá, "giá từ" là giá một đêm thấp nhất). Hàm không bắt lỗi; gọi sau `await io()` (xem `loadSection`).
 * Các hàm còn lại của file này vẫn dùng mock nên có thể lệch với DB trong lúc chưa nối trang `/hotels`.
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
 * Mọi khách sạn khách được phép thấy, cho trang `/hotels` (vẫn là mock). Cùng quy tắc lọc/sắp xếp với
 * `getFeaturedHotels` nhưng dữ liệu không đi qua API.
 */
export async function getHotels(): Promise<HotelCardView[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("hotels", "destinations");

  return selectFeaturedHotels(hotels, hotelRoomTypes, destinations, hotels.length);
}

/** Slug các khách sạn có trang chi tiết — cho `generateStaticParams`. */
export async function getHotelSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("hotels");

  return listHotelSlugs(hotels, hotelRoomTypes, destinations);
}

/** Chi tiết khách sạn; `null` nếu không có, bị ẩn hoặc không có loại phòng (trang `notFound()`). */
export async function getHotelDetail(slug: string): Promise<HotelDetailView | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("hotels", "destinations");

  return findHotelDetail(hotels, hotelRoomTypes, destinations, slug);
}

/**
 * Kết quả tìm khách sạn (tham số đã qua `parseHotelSearchParams`). Cache theo bộ tham số; tham số không phụ thuộc
 * thời điểm hiện tại nên kết quả cũng vậy.
 */
export async function searchHotels(
  query: HotelSearchQuery,
): Promise<{ destinationName: string | null; items: HotelSearchResultView[] }> {
  "use cache";
  cacheLife("hours");
  cacheTag("hotels", "destinations");

  const result = searchHotelsIn(hotels, hotelRoomTypes, destinations, query);
  return { destinationName: result.destination?.name ?? null, items: result.items };
}
