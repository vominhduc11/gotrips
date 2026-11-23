/**
 * Lớp truy cập dữ liệu cho trang /tours. Cùng quy ước với `lib/data/home.ts`: component chỉ import từ đây;
 * khi nối API thật chỉ đổi thân hàm, giữ nguyên chữ ký và các directive cache.
 *
 * `filters` là đối số nên nằm trong khoá cache: mỗi tổ hợp bộ lọc được cache riêng (tối đa 1 giờ).
 * Schema đã giới hạn độ dài `q` để khoá cache không phình vô hạn.
 */
import { cacheLife, cacheTag } from "next/cache";
import type { TourFilters } from "@/lib/schemas/tour-filters";
import { departures } from "@/lib/mock/departures";
import { destinations } from "@/lib/mock/destinations";
import { testimonials } from "@/lib/mock/testimonials";
import { tours } from "@/lib/mock/tours";
import type { TourDetailView } from "@/lib/types";
import { searchTourList, type TourSearchResult } from "./tour-search";
import { getTodayInVietnam, toTourDetailView } from "./tour-view";

export type { TourSearchResult };

export async function searchTours(filters: TourFilters): Promise<TourSearchResult> {
  "use cache";
  cacheLife("hours");
  cacheTag("tours", "departures", "destinations");

  return searchTourList({ tours, destinations, departures, filters, today: getTodayInVietnam() });
}

/** Slug của mọi tour đang hiển thị — dùng cho `generateStaticParams` (tour HIDDEN không có trang). */
export async function getTourSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("tours");

  return tours.filter((tour) => tour.status === "ACTIVE").map((tour) => tour.slug);
}

/** Chi tiết một tour; `null` nếu không có hoặc đang bị ẩn (trang sẽ trả 404). */
export async function getTourDetail(slug: string): Promise<TourDetailView | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("tours", "departures", "testimonials");

  const tour = tours.find((t) => t.slug === slug && t.status === "ACTIVE");
  const destination = tour && destinations.find((d) => d.id === tour.destinationId);
  if (!tour || !destination) return null;

  return toTourDetailView(
    tour,
    destination,
    departures.filter((d) => d.tourId === tour.id),
    testimonials.filter((t) => t.tourId === tour.id),
    getTodayInVietnam(),
  );
}
