/**
 * Kiểu dữ liệu của gotrips-web.
 *
 * Mọi dữ liệu nghiệp vụ đến từ gotrips-api. Hình dạng nào trùng hẳn DTO của API thì dùng DTO do Orval sinh
 * (`lib/api/generated`), ở đây chỉ đặt lại tên cho dễ đọc. Nhóm "View" là hình dạng giao diện cần: response của API gán
 * thẳng vào (TypeScript báo lỗi nếu API đổi hình dạng), hoặc `lib/data/*` đổi từ DTO sang (đơn đặt chỗ, vé máy bay).
 */
import type {
  AirlineResponse,
  AirportResponse,
  BankTransferResponse,
  BookingContactResponse,
  BookingKind as ApiBookingKind,
  BookingStatus as ApiBookingStatus,
  DestinationResponse,
  FlightFaresResponse,
  FlightOptionResponse,
  FlightSegmentResponse,
  HotelDetailResponse,
  HotelRoomTypeDetailResponse,
  HotelRoomTypeResponse,
  ImageResponse,
  PaymentStatus as ApiPaymentStatus,
  TestimonialResponse,
  TourTestimonialResponse,
} from "@/lib/api/generated/model";

// ---------------------------------------------------------------------------
// Trùng DTO của API
// ---------------------------------------------------------------------------

/** Sân bay (mã IATA, tên sân bay, thành phố). */
export type Airport = AirportResponse;
export type Airline = AirlineResponse;

/** Điểm đến kèm số tour đang hiển thị. */
export type DestinationCardView = DestinationResponse;

/** Loại phòng (nằm trong một khách sạn). "Giá từ" của khách sạn là giá thấp nhất trong các loại phòng của nó. */
export type HotelRoomTypeView = HotelRoomTypeResponse;
/** Loại phòng ở trang chi tiết: thêm bộ ảnh và tiện ích. Gửi sang Client Component thì lược còn `HotelRoomTypeView`. */
export type HotelRoomTypeDetailView = HotelRoomTypeDetailResponse;

/**
 * Trang chi tiết khách sạn: thông tin thẻ + giới thiệu, tiện ích, bộ ảnh xem thêm (không gồm ảnh đại diện `imageUrl`),
 * giờ nhận/trả phòng và các loại phòng (sắp theo giá tăng dần).
 */
export type HotelDetailView = HotelDetailResponse;

/** Một ảnh trong bộ ảnh, kèm mô tả thay thế. */
export type ImageView = ImageResponse;

/** Đánh giá của một tour (trang chi tiết tour). */
export type Testimonial = TourTestimonialResponse;
/** Đánh giá kèm tên tour (Trang chủ). */
export type TestimonialView = TestimonialResponse;

/** Loại dịch vụ của một đơn: TOUR, HOTEL, FLIGHT. */
export type BookingKind = ApiBookingKind;
/** Trạng thái đơn. Trạng thái thanh toán lưu RIÊNG, không gộp vào đây. */
export type BookingStatus = ApiBookingStatus;
export type PaymentStatus = ApiPaymentStatus;
export type BookingContact = BookingContactResponse;

/** Tài khoản nhận chuyển khoản và nội dung chuyển khoản (= mã đơn) của một đơn. */
export type BankTransferInfo = BankTransferResponse;

/** Giá vé MỘT hành khách theo loại cho một chặng, VND (do API tính). */
export type FlightFares = FlightFaresResponse;

// ---------------------------------------------------------------------------
// Giá trị trên URL/form của web (ánh xạ sang enum của API ở `lib/data/flight-request.ts`)
// ---------------------------------------------------------------------------

/** Hạng ghế (trùng giá trị với `CABIN_OPTIONS` ở `lib/schemas/flight-search.ts`). */
export type CabinClassValue = "economy" | "premiumEconomy" | "business" | "first";

export type PassengerType = "adult" | "child" | "infant";

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

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

/** Một trang kết quả của `/tours` (API lọc, sắp xếp và phân trang). */
export interface TourSearchResultView {
  items: TourCardView[];
  /** Tổng số tour khớp bộ lọc (trước khi phân trang). */
  total: number;
  /** Trang thực tế sau khi API kẹp vào [1, pageCount]. */
  page: number;
  pageCount: number;
  /** Tên điểm đến đang lọc; null nếu không lọc hoặc slug không tồn tại. */
  destinationName: string | null;
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
  /** Slug điểm đến — chính là giá trị của ô "Điểm đến" trong form tìm khách sạn. */
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
  /** Giá tham khảo một chiều cho một hành khách, VND — chỉ để gợi ý, không phải giá bán. */
  referencePrice: number;
  imageUrl: string;
  imageAlt: string;
}

/** Một khách sạn trong kết quả tìm kiếm: phòng rẻ nhất còn đủ chỗ và tổng tiền cho cả kỳ lưu trú. */
export interface HotelSearchResultView extends HotelCardView {
  room: HotelRoomTypeView;
  nights: number;
  rooms: number;
  /** `room.pricePerNight × nights × rooms`, VND. */
  totalPrice: number;
}

/** Một chuyến bay (lịch bay + ngày) trong kết quả tìm vé và ở trang đặt vé; `cabin` đổi sang giá trị của web. */
export type FlightOptionView = Omit<FlightOptionResponse, "cabin"> & { cabin: CabinClassValue };

export interface HeroBanner {
  imageUrl: string;
  imageAlt: string;
}

/** Một dòng thông tin ngắn của đơn, kèm biểu tượng (giao diện chọn icon theo `icon`). */
export interface BookingHighlight {
  icon: "calendar" | "users" | "bed" | "plane" | "clock" | "compass";
  text: string;
}

/** Một dòng trong trang "Đơn đặt chỗ của tôi" — dùng chung cho tour, khách sạn, vé máy bay. */
export interface BookingSummaryView {
  code: string;
  kind: BookingKind;
  /** "Tour", "Khách sạn", "Vé máy bay". */
  kindLabel: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  /** Tên tour / tên khách sạn / "TP. Hồ Chí Minh – Hà Nội". */
  title: string;
  /** Trang của sản phẩm (tour, khách sạn); vé máy bay không có trang chi tiết → null. */
  productHref: string | null;
  /** Dòng nhỏ phía trên tiêu đề: điểm đến, hoặc hạng ghế với vé máy bay. */
  subtitle: string;
  coverImage: string;
  coverImageAlt: string;
  highlights: BookingHighlight[];
  totalAmount: number;
  /** ISO 8601. */
  createdAt: string;
}

/** Một dòng tính tiền ở khối "Thanh toán", ví dụ "8.990.000 ₫ × 2 khách" → 17.980.000. */
export interface BookingPriceLine {
  label: string;
  amount: number;
}

/** Một người trong đơn (người đi, người nhận phòng, hành khách). */
export interface BookingPersonView {
  name: string;
  /** Ví dụ "Sinh ngày 12/04/1995", "Người lớn · chưa nhập ngày sinh". */
  detail: string;
}

/** Phần chung của trang chi tiết đơn (mọi loại dịch vụ). */
interface BookingDetailBase extends BookingSummaryView {
  contact: BookingContact;
  note: string | null;
  priceLines: BookingPriceLine[];
  /** Tiêu đề khối danh sách người, ví dụ "Người đi (2)". */
  peopleHeading: string;
  people: BookingPersonView[];
  paidAt: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  /** Đơn đã huỷ sau khi khách chuyển tiền: nhân viên phải hoàn tiền thủ công. */
  needsRefund: boolean;
  bankTransfer: BankTransferInfo;
}

/** Một chặng bay trong trang chi tiết đơn vé máy bay (giá đã chốt lúc đặt). */
export type BookingFlightSegmentView = FlightSegmentResponse & {
  cabin: CabinClassValue;
  /** "Chiều đi" / "Chiều về". */
  label: string;
};

/**
 * Trang chi tiết đơn. Phần khác nhau theo loại dịch vụ đã được quy về `highlights` (ngày, số khách, phòng...),
 * `priceLines`, `people`; riêng vé máy bay có thêm danh sách chặng bay (`flightSegments`, rỗng với loại khác).
 */
export interface BookingDetailView extends BookingDetailBase {
  flightSegments: BookingFlightSegmentView[];
}
