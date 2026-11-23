/**
 * Kiểu dữ liệu của gotrips-web.
 *
 * Nhóm "bảng" phản chiếu thiết kế database MVP (destinations, tours, tour_images,
 * tour_departures) — đây là hình dạng dữ liệu mà API thật sẽ trả về. Khách sạn
 * (hotels, hotel_room_types) và chặng bay (flight_routes) là dữ liệu THỬ NGHIỆM
 * cho hai section ở Trang chủ: chưa có trong thiết kế MVP, chưa có API.
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

/** Sân bay (dữ liệu tham chiếu cho ô tìm vé máy bay). */
export interface Airport {
  /** Mã IATA, 3 chữ in hoa, ví dụ "HAN". */
  code: string;
  /** Tên sân bay, ví dụ "Sân bay Nội Bài". */
  name: string;
  /** Thành phố/khu vực phục vụ, ví dụ "Hà Nội". */
  city: string;
}

export type HotelStatus = "ACTIVE" | "HIDDEN";

/** Khách sạn (dữ liệu thử nghiệm — chưa có trang `/hotels`, chưa đặt phòng được). */
export interface Hotel {
  id: number;
  slug: string;
  name: string;
  destinationId: number;
  /** Hạng sao của khách sạn, số nguyên 1–5 (khác với `rating` là điểm khách chấm). */
  starRating: number;
  /** Khu vực/địa chỉ ngắn, ví dụ "Phường 3, Đà Lạt". */
  area: string;
  imageUrl: string;
  imageAlt: string;
  status: HotelStatus;
  /** Điểm khách chấm 0–5. */
  rating: number;
  reviewCount: number;
}

/** Loại phòng của khách sạn; "giá từ" của khách sạn là giá thấp nhất trong các loại phòng của nó. */
export interface HotelRoomType {
  id: number;
  hotelId: number;
  name: string;
  /** Giá mỗi đêm, VND. */
  pricePerNight: number;
  maxGuests: number;
}

/** Chặng bay phổ biến (dữ liệu thử nghiệm — chưa có trang `/flights`, chưa đặt vé được). */
export interface FlightRoute {
  id: number;
  /** Mã IATA sân bay đi, phải có trong bảng sân bay. */
  fromCode: string;
  /** Mã IATA sân bay đến, phải có trong bảng sân bay và khác `fromCode`. */
  toCode: string;
  durationMinutes: number;
  /** Giá tham khảo một chiều cho một hành khách, VND — chỉ để gợi ý, không phải giá bán. */
  referencePrice: number;
  imageUrl: string;
  imageAlt: string;
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

/** Một chuyến khởi hành ở trang chi tiết tour (chỉ chuyến ở tương lai; chuyến đã đầy vẫn có để khách thấy lịch). */
export interface TourDepartureView {
  id: number;
  /** `YYYY-MM-DD`. */
  departureDate: string;
  price: number;
  /** Giá gốc, chỉ có khi đang giảm giá. */
  originalPrice: number | null;
  discountPercent: number | null;
  seatsLeft: number;
  isSoldOut: boolean;
  /** Còn chỗ nhưng ≤ ngưỡng "sắp hết chỗ". */
  isAlmostFull: boolean;
}

/** Dữ liệu trang chi tiết tour: thông tin thẻ tour + mô tả, lịch khởi hành và đánh giá của chính tour. */
export interface TourDetailView extends TourCardView {
  shortDescription: string;
  /** Sắp theo ngày tăng dần. */
  departures: TourDepartureView[];
  testimonials: Testimonial[];
}

export interface HotelCardView {
  id: number;
  slug: string;
  name: string;
  destinationName: string;
  /** Slug điểm đến — chính là giá trị của ô "Điểm đến" trong form tìm khách sạn (dùng để điền sẵn). */
  destinationSlug: string;
  area: string;
  starRating: number;
  imageUrl: string;
  imageAlt: string;
  rating: number;
  reviewCount: number;
  /** "Giá từ": giá một đêm thấp nhất trong các loại phòng của khách sạn, VND. */
  minPricePerNight: number;
}

export interface FlightRouteCardView {
  id: number;
  /** Sân bay đi (mã, tên sân bay, thành phố). */
  from: Airport;
  /** Sân bay đến. */
  to: Airport;
  durationMinutes: number;
  referencePrice: number;
  imageUrl: string;
  imageAlt: string;
}

export interface TestimonialView extends Testimonial {
  tourTitle: string;
}

export interface HeroBanner {
  imageUrl: string;
  imageAlt: string;
}
