/**
 * Lớp truy cập dữ liệu cho Trang chủ. Component CHỈ import từ `lib/data/*`, không import `lib/mock/*`.
 *
 * Điểm đến, tour nổi bật và đánh giá lấy từ gotrips-api (client do Orval sinh ở `lib/api/generated`). Chữ ký hàm và các
 * directive `"use cache"` / `cacheLife` / `cacheTag` giữ nguyên từ thời còn mock. Banner Hero vẫn là dữ liệu tĩnh.
 *
 *  - Mọi trường suy ra (`tourCount`, `priceFrom`, `nextDepartureDate`, `seatsLeft`, giảm giá...) do API tính sẵn,
 *    kèm luật bỏ tour HIDDEN; web không tải lịch khởi hành để tự tính nữa. Response của API khớp kiểu "View" trong
 *    `lib/types.ts` nên gán thẳng; TypeScript báo lỗi nếu API đổi hình dạng.
 *  - `cacheLife`: "hours" cho dữ liệu phụ thuộc "hôm nay" (ngày khởi hành còn đặt được) để không bị cũ quá một giờ.
 *    Khi admin đổi dữ liệu thì gọi `revalidateTag(tag, ...)` theo các tag bên dưới.
 *  - Hàm KHÔNG bắt lỗi: API lỗi thì lỗi được ném ra và Next không cache kết quả đó. Nuốt lỗi rồi trả `[]` sẽ khiến
 *    Trang chủ rỗng suốt thời gian cache. Nơi gọi (`loadSection`) mới quyết định hiện gì khi lỗi.
 *  - Các hàm này chỉ được gọi sau `await io()` (trong `loadSection`) để `next build` không phải gọi API.
 */
import { cacheLife, cacheTag } from "next/cache";
import { listDestinations, listFeaturedTours, listTestimonials } from "@/lib/api/generated";
import { heroBanner } from "@/lib/mock/site";
import type { DestinationCardView, HeroBanner, TestimonialView, TourCardView } from "@/lib/types";
import { catalogRequestInit } from "./catalog-request";

export async function getHeroBanner(): Promise<HeroBanner> {
  "use cache";
  cacheLife("days");
  cacheTag("site");

  return heroBanner;
}

export async function getPopularDestinations(): Promise<DestinationCardView[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("destinations", "tours");

  // API chỉ đếm tour ACTIVE vào `tourCount` (tour HIDDEN không được đếm).
  const { data } = await listDestinations(catalogRequestInit());
  return data;
}

export async function getFeaturedTours(limit = 8): Promise<TourCardView[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("tours", "departures");

  // API chỉ trả tour ACTIVE + nổi bật còn ít nhất một chuyến đặt được (tính theo "hôm nay" giờ Việt Nam).
  const { data } = await listFeaturedTours({ limit }, catalogRequestInit());
  return data;
}

export async function getTestimonials(): Promise<TestimonialView[]> {
  "use cache";
  cacheLife("days");
  cacheTag("testimonials");

  // API không trả đánh giá của tour HIDDEN (kèm tên tour) — mock cũ không lọc điểm này.
  const { data } = await listTestimonials(catalogRequestInit());
  return data;
}
