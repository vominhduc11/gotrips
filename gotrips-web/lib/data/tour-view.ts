import type {
  Destination,
  Testimonial,
  Tour,
  TourCardView,
  TourDeparture,
  TourDepartureView,
  TourDetailView,
} from "@/lib/types";

/** Chỉ còn ≤ ngưỡng này thì hiện nhãn "Sắp hết chỗ". */
export const ALMOST_FULL_THRESHOLD = 5;

/** Ngày hôm nay (`YYYY-MM-DD`) theo giờ Việt Nam — không phụ thuộc múi giờ máy chủ. */
export function getTodayInVietnam(now: Date = new Date()): string {
  // Locale "en-CA" cho ra đúng định dạng YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(now);
}

export function getSeatsLeft(departure: Pick<TourDeparture, "totalSeats" | "bookedSeats">): number {
  return Math.max(0, departure.totalSeats - departure.bookedSeats);
}

/**
 * Các chuyến khách còn đặt được: ở tương lai (sau hôm nay) và còn chỗ, sắp theo ngày tăng dần.
 * So sánh chuỗi `YYYY-MM-DD` là đúng thứ tự thời gian.
 */
export function getBookableDepartures(departures: TourDeparture[], today: string): TourDeparture[] {
  return departures
    .filter((d) => d.departureDate > today && getSeatsLeft(d) > 0)
    .sort((a, b) => a.departureDate.localeCompare(b.departureDate));
}

/**
 * Ghép tour + điểm đến + lịch khởi hành thành dữ liệu cho `TourCard`. Hàm thuần (nhận `today`) nên dễ kiểm thử.
 *
 *  - Giá từ         = chuyến bookable có giá thấp nhất (kèm giá gốc/% giảm của chính chuyến đó).
 *  - Ngày gần nhất  = chuyến bookable sớm nhất.
 *  - Số chỗ còn lại = của chuyến gần nhất (cùng chuyến với ngày đang hiển thị).
 */
export function toTourCardView(
  tour: Tour,
  destination: Destination,
  tourDepartures: TourDeparture[],
  today: string,
): TourCardView {
  const bookable = getBookableDepartures(tourDepartures, today);
  const nearest = bookable[0] ?? null;
  const cheapest = bookable.reduce<TourDeparture | null>(
    (best, d) => (best === null || d.price < best.price ? d : best),
    null,
  );

  const originalPriceFrom =
    cheapest?.originalPrice !== undefined && cheapest.originalPrice > cheapest.price
      ? cheapest.originalPrice
      : null;
  const seatsLeft = nearest ? getSeatsLeft(nearest) : null;

  return {
    id: tour.id,
    slug: tour.slug,
    title: tour.title,
    destinationName: destination.name,
    destinationSlug: destination.slug,
    durationDays: tour.durationDays,
    durationNights: tour.durationNights,
    departureCity: tour.departureCity,
    coverImage: tour.coverImage,
    coverImageAlt: tour.coverImageAlt,
    rating: tour.rating,
    reviewCount: tour.reviewCount,
    nextDepartureDate: nearest?.departureDate ?? null,
    seatsLeft,
    priceFrom: cheapest?.price ?? null,
    originalPriceFrom,
    discountPercent:
      cheapest && originalPriceFrom
        ? Math.round(((originalPriceFrom - cheapest.price) / originalPriceFrom) * 100)
        : null,
    isAlmostFull: seatsLeft !== null && seatsLeft <= ALMOST_FULL_THRESHOLD,
  };
}

export function toDepartureView(departure: TourDeparture): TourDepartureView {
  const seatsLeft = getSeatsLeft(departure);
  const hasDiscount = departure.originalPrice !== undefined && departure.originalPrice > departure.price;

  return {
    id: departure.id,
    departureDate: departure.departureDate,
    price: departure.price,
    originalPrice: hasDiscount ? (departure.originalPrice ?? null) : null,
    discountPercent:
      hasDiscount && departure.originalPrice
        ? Math.round(((departure.originalPrice - departure.price) / departure.originalPrice) * 100)
        : null,
    seatsLeft,
    isSoldOut: seatsLeft === 0,
    isAlmostFull: seatsLeft > 0 && seatsLeft <= ALMOST_FULL_THRESHOLD,
  };
}

/**
 * Dữ liệu trang chi tiết tour. Hàm thuần (nhận `today`).
 * Thông tin "giá từ"/"ngày gần nhất" lấy từ `toTourCardView` để trang chi tiết và thẻ tour luôn khớp nhau;
 * danh sách chuyến thì giữ cả chuyến đã đầy (hiện "Hết chỗ") nhưng bỏ chuyến đã qua.
 */
export function toTourDetailView(
  tour: Tour,
  destination: Destination,
  tourDepartures: TourDeparture[],
  testimonials: Testimonial[],
  today: string,
): TourDetailView {
  return {
    ...toTourCardView(tour, destination, tourDepartures, today),
    shortDescription: tour.shortDescription,
    departures: tourDepartures
      .filter((d) => d.departureDate > today)
      .sort((a, b) => a.departureDate.localeCompare(b.departureDate))
      .map(toDepartureView),
    testimonials,
  };
}
