/**
 * Lớp truy cập dữ liệu cho Trang chủ. Component CHỈ import từ `lib/data/*`, không import `lib/mock/*`.
 *
 * Hiện các hàm trả về dữ liệu mock. Để chuyển sang API thật chỉ cần đổi PHẦN THÂN hàm thành
 * `fetch(...)` (+ map response sang các kiểu trong `lib/types`), giữ nguyên chữ ký và các
 * directive `"use cache"` / `cacheLife` / `cacheTag`:
 *
 *  - `cacheComponents` đang bật, và "hôm nay" (dùng để lọc ngày khởi hành) là dữ liệu phụ thuộc
 *    thời điểm — phải nằm trong phạm vi `"use cache"` thì Trang chủ mới prerender được thành static shell.
 *  - `cacheLife("hours")`: làm mới tối đa mỗi giờ nên danh sách "ngày còn chỗ" không bị cũ quá lâu.
 *  - `cacheTag(...)`: sau này gọi `revalidateTag("tours")` khi admin đổi tour/lịch khởi hành.
 */
import { cacheLife, cacheTag } from "next/cache";
import { destinations } from "@/lib/mock/destinations";
import { departures } from "@/lib/mock/departures";
import { heroBanner } from "@/lib/mock/site";
import { testimonials } from "@/lib/mock/testimonials";
import { tours } from "@/lib/mock/tours";
import type {
  DestinationCardView,
  HeroBanner,
  TestimonialView,
  TourCardView,
} from "@/lib/types";
import { getTodayInVietnam, toTourCardView } from "./tour-view";

/** Tour khách được phép thấy: bỏ tour HIDDEN. */
function getVisibleTours() {
  return tours.filter((tour) => tour.status === "ACTIVE");
}

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

  const visibleTours = getVisibleTours();
  return destinations.map((destination) => ({
    ...destination,
    // Suy ra từ tour ACTIVE — tour HIDDEN không được đếm.
    tourCount: visibleTours.filter((tour) => tour.destinationId === destination.id).length,
  }));
}

export async function getFeaturedTours(limit = 8): Promise<TourCardView[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("tours", "departures");

  const today = getTodayInVietnam();
  const views: TourCardView[] = [];

  for (const tour of getVisibleTours()) {
    if (!tour.isFeatured) continue;
    const destination = destinations.find((d) => d.id === tour.destinationId);
    if (!destination) continue;

    const view = toTourCardView(
      tour,
      destination,
      departures.filter((d) => d.tourId === tour.id),
      today,
    );
    // Tour không còn chuyến nào đặt được thì không đưa lên Trang chủ.
    if (view.nextDepartureDate !== null) views.push(view);
  }

  return views.slice(0, limit);
}

export async function getTestimonials(): Promise<TestimonialView[]> {
  "use cache";
  cacheLife("days");
  cacheTag("testimonials");

  return testimonials.flatMap((testimonial) => {
    const tour = tours.find((t) => t.id === testimonial.tourId);
    return tour ? [{ ...testimonial, tourTitle: tour.title }] : [];
  });
}
