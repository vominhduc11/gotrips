/**
 * Kiểu dữ liệu của gotrips-web.
 *
 * Nhóm "bảng" phản chiếu thiết kế database MVP (destinations, tours, tour_images,
 * tour_departures) — đây là hình dạng dữ liệu mà API thật sẽ trả về.
 * Nhóm "View" là dữ liệu đã được suy ra/ghép sẵn cho giao diện; chúng được tính
 * trong `lib/data/*`, KHÔNG lưu trong mock.
 */

// ---------------------------------------------------------------------------
// Bảng (khớp database)
// ---------------------------------------------------------------------------

export interface Destination {
  id: number;
  slug: string;
  name: string;
  /** Vùng miền, ví dụ "Tây Nguyên". */
  region: string;
  imageUrl: string;
  imageAlt: string;
}

export type TourStatus = "ACTIVE" | "HIDDEN";

export interface Tour {
  id: number;
  slug: string;
  title: string;
  destinationId: number;
  durationDays: number;
  durationNights: number;
  /** Nơi tập trung/khởi hành, ví dụ "TP. Hồ Chí Minh". */
  departureCity: string;
  shortDescription: string;
  coverImage: string;
  coverImageAlt: string;
  /** Điểm trung bình 0–5. */
  rating: number;
  reviewCount: number;
  isFeatured: boolean;
  status: TourStatus;
}

/** Ảnh bổ sung của tour (thư viện ảnh ở trang chi tiết — chưa dùng ở Trang chủ). */
export interface TourImage {
  id: number;
  tourId: number;
  url: string;
  alt: string;
  sortOrder: number;
}

export interface TourDeparture {
  id: number;
  tourId: number;
  /** Ngày khởi hành dạng `YYYY-MM-DD` (kiểu DATE, không có múi giờ). */
  departureDate: string;
  /** Giá mỗi khách, VND. */
  price: number;
  /** Giá gốc trước giảm (nếu đang giảm giá), VND. */
  originalPrice?: number;
  totalSeats: number;
  bookedSeats: number;
}

export interface Testimonial {
  id: number;
  tourId: number;
  customerName: string;
  customerCity: string;
  /** 1–5. */
  rating: number;
  content: string;
}

// ---------------------------------------------------------------------------
// View (suy ra trong lib/data, không lưu trong mock)
// ---------------------------------------------------------------------------

export interface DestinationCardView extends Destination {
  /** Số tour ACTIVE thuộc điểm đến này. */
  tourCount: number;
}

export interface TourCardView {
  id: number;
  slug: string;
  title: string;
  destinationName: string;
  destinationSlug: string;
  durationDays: number;
  durationNights: number;
  departureCity: string;
  coverImage: string;
  coverImageAlt: string;
  rating: number;
  reviewCount: number;
  /** Ngày khởi hành còn chỗ gần nhất (`YYYY-MM-DD`); null nếu không còn chuyến nào. */
  nextDepartureDate: string | null;
  /** Số chỗ còn lại của chuyến gần nhất; null nếu không còn chuyến nào. */
  seatsLeft: number | null;
  /** "Giá từ": giá thấp nhất trong các chuyến còn chỗ, ở tương lai; null nếu không còn chuyến nào. */
  priceFrom: number | null;
  /** Giá gốc của chuyến cho "giá từ", chỉ có khi đang giảm giá. */
  originalPriceFrom: number | null;
  /** % giảm làm tròn, chỉ có khi đang giảm giá. */
  discountPercent: number | null;
  /** `seatsLeft` ≤ ngưỡng "sắp hết chỗ". */
  isAlmostFull: boolean;
}

export interface TestimonialView extends Testimonial {
  tourTitle: string;
}

export interface HeroBanner {
  imageUrl: string;
  imageAlt: string;
}
