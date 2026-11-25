/**
 * Kiểu dữ liệu của gotrips-web.
 *
 * Nhóm "bảng" phản chiếu thiết kế database MVP (destinations, tours, tour_images,
 * tour_departures) — đây là hình dạng dữ liệu mà API thật sẽ trả về. Khách sạn
 * (hotels, hotel_room_types), chặng bay phổ biến (flight_routes), hãng bay và lịch bay (airlines, flight_schedules)
 * là dữ liệu mock: chưa có trong thiết kế MVP, chưa có API.
 * Đơn đặt chỗ (bookings + chi tiết theo loại: tour, khách sạn, vé máy bay; payments) cũng đang là bản demo: lưu trong
 * cookie, chưa có API.
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

/** Khách sạn (dữ liệu mock, chưa có API). */
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
  /** Đoạn giới thiệu ngắn ở trang chi tiết. */
  description: string;
  /** Tiện ích nổi bật, ví dụ "Hồ bơi ngoài trời". */
  amenities: string[];
  /** Giờ nhận phòng / trả phòng, dạng "HH:mm". */
  checkInTime: string;
  checkOutTime: string;
}

/** Loại phòng của khách sạn; "giá từ" của khách sạn là giá thấp nhất trong các loại phòng của nó. */
export interface HotelRoomType {
  id: number;
  hotelId: number;
  name: string;
  /** Giá mỗi đêm cho MỘT phòng, VND. */
  pricePerNight: number;
  /** Số khách tối đa mỗi phòng. */
  maxGuests: number;
  /** Mô tả giường, ví dụ "1 giường đôi lớn". */
  bedType: string;
  /** Diện tích phòng, m². */
  areaM2: number;
}

/** Chặng bay phổ biến ở Trang chủ và trang `/flights` (gợi ý điểm đi/đến; giá tham khảo, không phải giá bán). */
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

/** Hãng bay (tên giả cho bản demo). */
export interface Airline {
  /** Mã 2 ký tự, cũng là tiền tố số hiệu chuyến bay. */
  code: string;
  name: string;
}

/**
 * Lịch bay cố định: chuyến bay chạy MỖI NGÀY cùng giờ. Một chuyến bay cụ thể = lịch bay + ngày bay.
 * Giá vé lưu theo hạng Phổ thông cho một người lớn; hạng khác và trẻ em/em bé tính từ đó (`lib/data/flight-view.ts`).
 */
export interface FlightSchedule {
  id: number;
  airlineCode: string;
  /** Số hiệu chuyến bay, ví dụ "SV212". */
  flightNumber: string;
  fromCode: string;
  toCode: string;
  /** Giờ cất cánh theo giờ địa phương, "HH:mm". */
  departTime: string;
  durationMinutes: number;
  /** Giá vé hạng Phổ thông cho một người lớn, đã gồm thuế phí, VND. */
  economyFare: number;
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

/** Trạng thái đơn đặt tour (bảng bookings). Trạng thái thanh toán lưu RIÊNG ở `Payment`, không gộp vào đây. */
export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

/** Trạng thái thanh toán (bảng payments). `CANCELLED`: đơn bị huỷ khi chưa trả tiền nên khoản cần thu không còn. */
export type PaymentStatus = "UNPAID" | "PAID" | "CANCELLED";

/** MVP chỉ có chuyển khoản thủ công (nhân viên đối chiếu rồi đánh dấu đã thanh toán), chưa có cổng thanh toán. */
export type PaymentMethod = "BANK_TRANSFER";

export interface BookingContact {
  fullName: string;
  email: string;
  phone: string;
}

/** Một người đi trong đơn (bảng booking_travelers). */
export interface BookingTraveler {
  fullName: string;
  /** `YYYY-MM-DD`, hoặc null nếu khách không nhập. */
  dateOfBirth: string | null;
}

export interface Payment {
  method: PaymentMethod;
  /** Số tiền cần thu, VND (= tổng tiền của đơn). */
  amount: number;
  status: PaymentStatus;
  /** Thời điểm nhân viên đánh dấu đã nhận tiền (ISO 8601). */
  paidAt: string | null;
}

/** Loại dịch vụ của một đơn. Mã đơn, trạng thái, thanh toán dùng chung; phần chi tiết khác nhau theo loại. */
export type BookingKind = "tour" | "hotel" | "flight";

/** Phần chung của mọi đơn (bảng bookings + payments). */
export interface BookingBase {
  /** Mã đơn dễ đọc, cũng là nội dung chuyển khoản, ví dụ "GT7K4Q2M". */
  code: string;
  /** Email tài khoản đặt đơn — chỉ chủ đơn xem được đơn. */
  ownerEmail: string;
  /** Tổng tiền server tính lúc đặt, VND. */
  totalAmount: number;
  contact: BookingContact;
  note: string | null;
  status: BookingStatus;
  payment: Payment;
  /** Các mốc thời gian dạng ISO 8601. */
  createdAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
}

/** Đơn đặt tour (bảng booking_travelers giữ người đi). */
export interface TourBooking extends BookingBase {
  kind: "tour";
  departureId: number;
  guestCount: number;
  /** Giá mỗi khách tại thời điểm đặt (server lấy từ lịch khởi hành, không nhận từ trình duyệt), VND. */
  unitPrice: number;
  travelers: BookingTraveler[];
}

/** Đơn đặt phòng khách sạn: một loại phòng × số phòng × số đêm. */
export interface HotelBooking extends BookingBase {
  kind: "hotel";
  hotelId: number;
  roomTypeId: number;
  /** `YYYY-MM-DD`. */
  checkIn: string;
  checkOut: string;
  nights: number;
  rooms: number;
  guestCount: number;
  /** Giá một phòng một đêm tại thời điểm đặt, VND. */
  pricePerNight: number;
  /** Họ tên người nhận phòng (xuất trình giấy tờ khi nhận phòng). */
  guestName: string;
}

export type PassengerType = "adult" | "child" | "infant";

export interface FlightPassenger {
  type: PassengerType;
  fullName: string;
  /** `YYYY-MM-DD`; bắt buộc với trẻ em và em bé (để kiểm tuổi), người lớn có thể null. */
  dateOfBirth: string | null;
}

/** Giá vé MỘT hành khách theo loại, tại thời điểm đặt, VND. */
export interface FlightFares {
  adult: number;
  child: number;
  infant: number;
}

/** Một chặng của đơn vé máy bay: lịch bay + ngày bay + giá đã chốt lúc đặt. */
export interface FlightBookingSegment {
  scheduleId: number;
  /** Ngày bay `YYYY-MM-DD`. */
  date: string;
  fares: FlightFares;
}

/** Đơn vé máy bay: một chiều (1 chặng) hoặc khứ hồi (2 chặng: đi rồi về). */
export interface FlightBooking extends BookingBase {
  kind: "flight";
  cabin: CabinClassValue;
  segments: FlightBookingSegment[];
  passengers: FlightPassenger[];
}

/** Hạng ghế (trùng giá trị với `CABIN_OPTIONS` ở `lib/schemas/flight-search.ts`). */
export type CabinClassValue = "economy" | "premiumEconomy" | "business" | "first";

/**
 * Đơn đặt chỗ. Trong database MVP là bảng bookings + bảng chi tiết theo loại + payments; ở bản demo được gói chung một
 * bản ghi (lưu trong cookie, xem `lib/booking/demo-store.ts`).
 */
export type Booking = TourBooking | HotelBooking | FlightBooking;

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
  referencePrice: number;
  imageUrl: string;
  imageAlt: string;
}

/** Trang chi tiết khách sạn: thông tin thẻ + giới thiệu, tiện ích, giờ nhận/trả phòng và các loại phòng. */
export interface HotelDetailView extends HotelCardView {
  description: string;
  amenities: string[];
  checkInTime: string;
  checkOutTime: string;
  /** Sắp theo giá tăng dần. */
  roomTypes: HotelRoomType[];
}

/** Một khách sạn trong kết quả tìm kiếm: phòng rẻ nhất chứa đủ số khách và tổng tiền cho cả kỳ lưu trú. */
export interface HotelSearchResultView extends HotelCardView {
  room: HotelRoomType;
  nights: number;
  rooms: number;
  /** `room.pricePerNight × nights × rooms`, VND. */
  totalPrice: number;
}

/** Một chuyến bay cụ thể (lịch bay + ngày) trong kết quả tìm vé và trong đơn. */
export interface FlightOptionView {
  scheduleId: number;
  airline: Airline;
  flightNumber: string;
  from: Airport;
  to: Airport;
  /** Ngày bay `YYYY-MM-DD`. */
  date: string;
  /** "HH:mm". */
  departTime: string;
  arriveTime: string;
  /** Hạ cánh sang ngày hôm sau. */
  arrivesNextDay: boolean;
  durationMinutes: number;
  cabin: CabinClassValue;
  fares: FlightFares;
}

export interface TestimonialView extends Testimonial {
  tourTitle: string;
}

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
  /** Tên tour / tên khách sạn / "TP. Hồ Chí Minh → Hà Nội". */
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
}

/** Một chặng bay trong trang chi tiết đơn vé máy bay. */
export interface BookingFlightSegmentView extends FlightOptionView {
  /** "Chiều đi" / "Chiều về". */
  label: string;
}

/**
 * Trang chi tiết đơn. Phần khác nhau theo loại dịch vụ đã được quy về `highlights` (ngày, số khách, phòng...),
 * `priceLines`, `people`; riêng vé máy bay có thêm danh sách chặng bay (`flightSegments`, rỗng với loại khác).
 */
export interface BookingDetailView extends BookingDetailBase {
  flightSegments: BookingFlightSegmentView[];
}

/** Tài khoản nhận chuyển khoản hiển thị trong hướng dẫn thanh toán. */
export interface BankTransferInfo {
  bankName: string;
  accountNumber: string;
  accountName: string;
}
