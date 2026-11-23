import { normalizeSearchText } from "@/lib/format";
import type { TourFilters } from "@/lib/schemas/tour-filters";
import type { Destination, Tour, TourCardView, TourDeparture } from "@/lib/types";
import { getBookableDepartures, getSeatsLeft, toTourCardView } from "./tour-view";

export const TOUR_PAGE_SIZE = 8;

export interface TourSearchResult {
  items: TourCardView[];
  /** Tổng số tour khớp bộ lọc (trước khi phân trang). */
  total: number;
  /** Trang thực tế sau khi kẹp vào [1, pageCount]. */
  page: number;
  pageCount: number;
  /** Điểm đến đang lọc; null nếu không lọc hoặc slug không tồn tại. */
  destination: Destination | null;
}

interface SearchInput {
  tours: Tour[];
  destinations: Destination[];
  departures: TourDeparture[];
  filters: TourFilters;
  /** Hôm nay `YYYY-MM-DD` (giờ Việt Nam) — truyền vào để hàm thuần, dễ kiểm thử. */
  today: string;
  pageSize?: number;
}

/**
 * Lọc → sắp xếp → phân trang danh sách tour. Hàm thuần (không cache, không I/O).
 *
 *  - Chỉ nhận tour `ACTIVE` (tour HIDDEN không bao giờ hiện).
 *  - Lọc `date`/`guests` chọn các CHUYẾN còn đặt được thoả điều kiện; thẻ tour hiển thị giá/ngày của đúng
 *    các chuyến đó, và tour không có chuyến nào thoả thì bị loại.
 *  - Khi không lọc ngày/khách, tour hết chỗ vẫn hiện (nhãn "Hết chỗ") và xếp cuối — để số tour khớp với
 *    số đếm ở thẻ "Điểm đến phổ biến".
 */
export function searchTourList({
  tours,
  destinations,
  departures,
  filters,
  today,
  pageSize = TOUR_PAGE_SIZE,
}: SearchInput): TourSearchResult {
  const destination = filters.destination
    ? (destinations.find((d) => d.slug === filters.destination) ?? null)
    : null;
  const hasDepartureFilter = Boolean(filters.date) || filters.guests !== undefined;
  const query = filters.q ? normalizeSearchText(filters.q) : null;

  const entries: { tour: Tour; view: TourCardView }[] = [];

  for (const tour of tours) {
    if (tour.status !== "ACTIVE") continue;
    const tourDestination = destinations.find((d) => d.id === tour.destinationId);
    if (!tourDestination) continue;

    // Slug không tồn tại → không có tour nào khớp (trang hiện trạng thái rỗng thay vì bỏ qua bộ lọc).
    if (filters.destination && tour.destinationId !== destination?.id) continue;
    if (query && !normalizeSearchText(`${tour.title} ${tourDestination.name}`).includes(query)) continue;

    let tourDepartures = departures.filter((d) => d.tourId === tour.id);
    if (hasDepartureFilter) {
      tourDepartures = getBookableDepartures(tourDepartures, today).filter(
        (d) =>
          (!filters.date || d.departureDate === filters.date) &&
          (filters.guests === undefined || getSeatsLeft(d) >= filters.guests),
      );
      if (tourDepartures.length === 0) continue;
    }

    entries.push({ tour, view: toTourCardView(tour, tourDestination, tourDepartures, today) });
  }

  entries.sort((a, b) => compareEntries(a, b, filters.sort));

  const total = entries.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(filters.page, pageCount);
  const start = (page - 1) * pageSize;

  return {
    items: entries.slice(start, start + pageSize).map((e) => e.view),
    total,
    page,
    pageCount,
    destination,
  };
}

type Entry = { tour: Tour; view: TourCardView };

function compareEntries(a: Entry, b: Entry, sort: TourFilters["sort"]): number {
  // Tour không còn chuyến nào (giá null) luôn xếp cuối, bất kể kiểu sắp xếp.
  const aOut = a.view.priceFrom === null;
  const bOut = b.view.priceFrom === null;
  if (aOut !== bOut) return aOut ? 1 : -1;

  let diff = 0;
  switch (sort) {
    case "gia-tang":
      diff = (a.view.priceFrom ?? 0) - (b.view.priceFrom ?? 0);
      break;
    case "gia-giam":
      diff = (b.view.priceFrom ?? 0) - (a.view.priceFrom ?? 0);
      break;
    case "ngay-gan":
      diff = (a.view.nextDepartureDate ?? "").localeCompare(b.view.nextDepartureDate ?? "");
      break;
    case "danh-gia":
      diff = b.view.rating - a.view.rating || b.view.reviewCount - a.view.reviewCount;
      break;
    case "noi-bat":
      diff =
        Number(b.tour.isFeatured) - Number(a.tour.isFeatured) ||
        b.view.rating - a.view.rating ||
        b.view.reviewCount - a.view.reviewCount;
      break;
  }
  return diff || a.tour.id - b.tour.id;
}
