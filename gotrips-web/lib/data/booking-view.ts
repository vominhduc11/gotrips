import { formatDate, formatDuration, formatVND } from "@/lib/format";
import { cabinLabel } from "@/lib/schemas/flight-search";
import type {
  Booking,
  BookingDetailView,
  BookingFlightSegmentView,
  BookingHighlight,
  BookingKind,
  BookingStatus,
  BookingSummaryView,
  Destination,
  FlightBooking,
  FlightOptionView,
  Hotel,
  HotelBooking,
  HotelRoomType,
  PaymentStatus,
  Tour,
  TourBooking,
  TourDeparture,
} from "@/lib/types";
import { buildFareLines, countPassengers, PASSENGER_TYPE_LABEL, SEGMENT_LABELS, summarizePassengers } from "./flight-view";

/** Biến thể `Badge` dùng cho trạng thái (xem `components/ui/badge.tsx`). */
export type StatusBadgeVariant = "info" | "soon" | "success" | "neutral";

/** Nhãn tiếng Việt của trạng thái đơn — một chỗ duy nhất cho mọi trang. */
export const BOOKING_STATUS_BADGE: Record<BookingStatus, { label: string; variant: StatusBadgeVariant }> = {
  PENDING: { label: "Chờ xác nhận", variant: "info" },
  CONFIRMED: { label: "Đã xác nhận", variant: "success" },
  CANCELLED: { label: "Đã huỷ", variant: "neutral" },
};

export const PAYMENT_STATUS_BADGE: Record<PaymentStatus, { label: string; variant: StatusBadgeVariant }> = {
  UNPAID: { label: "Chưa thanh toán", variant: "soon" },
  PAID: { label: "Đã thanh toán", variant: "success" },
  CANCELLED: { label: "Huỷ thanh toán", variant: "neutral" },
};

export const BOOKING_KIND_LABEL: Record<BookingKind, string> = {
  tour: "Tour",
  hotel: "Khách sạn",
  flight: "Vé máy bay",
};

/** Tổng tiền tour = giá mỗi khách × số khách (một chỗ tính duy nhất, dùng cả ở form tạm tính lẫn Server Action). */
export function computeBookingTotal(unitPrice: number, guestCount: number): number {
  return unitPrice * guestCount;
}

/** Dữ liệu tra cứu kèm theo từng loại đơn (đơn chỉ lưu id; tên, ảnh... lấy từ dữ liệu hiện tại). */
export interface TourBookingContext {
  tour: Tour;
  destination: Destination;
  departure: TourDeparture;
}

export interface HotelBookingContext {
  hotel: Hotel;
  destination: Destination;
  roomType: HotelRoomType;
}

export interface FlightBookingContext {
  /** Cùng thứ tự với `booking.segments` (đi, rồi về). */
  segments: FlightOptionView[];
  image: { imageUrl: string; imageAlt: string };
}

function baseSummary(booking: Booking): Pick<
  BookingSummaryView,
  "code" | "kind" | "kindLabel" | "status" | "paymentStatus" | "totalAmount" | "createdAt"
> {
  return {
    code: booking.code,
    kind: booking.kind,
    kindLabel: BOOKING_KIND_LABEL[booking.kind],
    status: booking.status,
    paymentStatus: booking.payment.status,
    totalAmount: booking.totalAmount,
    createdAt: booking.createdAt,
  };
}

function baseDetail(booking: Booking) {
  return {
    contact: booking.contact,
    note: booking.note,
    paidAt: booking.payment.paidAt,
    confirmedAt: booking.confirmedAt,
    cancelledAt: booking.cancelledAt,
    needsRefund: booking.status === "CANCELLED" && booking.payment.status === "PAID",
    flightSegments: [] as BookingFlightSegmentView[],
  };
}

const birthDetail = (dateOfBirth: string | null) =>
  dateOfBirth ? `Sinh ngày ${formatDate(dateOfBirth)}` : "Chưa nhập ngày sinh";

// --- Tour -------------------------------------------------------------------

export function toTourBookingSummaryView(booking: TourBooking, context: TourBookingContext): BookingSummaryView {
  const { tour, destination, departure } = context;
  return {
    ...baseSummary(booking),
    title: tour.title,
    productHref: `/tours/${tour.slug}`,
    subtitle: destination.name,
    coverImage: tour.coverImage,
    coverImageAlt: tour.coverImageAlt,
    highlights: [
      { icon: "calendar", text: `Khởi hành ${formatDate(departure.departureDate)}` },
      { icon: "users", text: `${booking.guestCount} khách` },
    ],
  };
}

export function toTourBookingDetailView(booking: TourBooking, context: TourBookingContext): BookingDetailView {
  const summary = toTourBookingSummaryView(booking, context);
  const { tour } = context;
  return {
    ...summary,
    ...baseDetail(booking),
    highlights: [
      ...summary.highlights,
      {
        icon: "clock",
        text: `${tour.durationDays} ngày ${tour.durationNights} đêm (${formatDuration(tour.durationDays, tour.durationNights)})`,
      },
      { icon: "compass", text: `Từ ${tour.departureCity}` },
    ],
    priceLines: [{ label: `${formatVND(booking.unitPrice)} × ${booking.guestCount} khách`, amount: booking.totalAmount }],
    peopleHeading: `Người đi (${booking.travelers.length})`,
    people: booking.travelers.map((t) => ({ name: t.fullName, detail: birthDetail(t.dateOfBirth) })),
  };
}

// --- Khách sạn ---------------------------------------------------------------

export function toHotelBookingSummaryView(booking: HotelBooking, context: HotelBookingContext): BookingSummaryView {
  const { hotel, destination, roomType } = context;
  return {
    ...baseSummary(booking),
    title: hotel.name,
    productHref: `/hotels/${hotel.slug}`,
    subtitle: destination.name,
    coverImage: hotel.imageUrl,
    coverImageAlt: hotel.imageAlt,
    highlights: [
      { icon: "calendar", text: `${formatDate(booking.checkIn)} – ${formatDate(booking.checkOut)} (${booking.nights} đêm)` },
      { icon: "bed", text: `${booking.rooms} × ${roomType.name}` },
      { icon: "users", text: `${booking.guestCount} khách` },
    ],
  };
}

export function toHotelBookingDetailView(booking: HotelBooking, context: HotelBookingContext): BookingDetailView {
  const summary = toHotelBookingSummaryView(booking, context);
  const { hotel } = context;
  return {
    ...summary,
    ...baseDetail(booking),
    highlights: [
      ...summary.highlights,
      { icon: "clock", text: `Nhận phòng từ ${hotel.checkInTime}, trả phòng trước ${hotel.checkOutTime}` },
      { icon: "compass", text: hotel.area },
    ],
    priceLines: [
      {
        label: `${formatVND(booking.pricePerNight)} × ${booking.nights} đêm × ${booking.rooms} phòng`,
        amount: booking.totalAmount,
      },
    ],
    peopleHeading: "Người nhận phòng",
    people: [{ name: booking.guestName, detail: `${booking.guestCount} khách · ${booking.rooms} phòng` }],
  };
}

// --- Vé máy bay ---------------------------------------------------------------

export function toFlightBookingSummaryView(booking: FlightBooking, context: FlightBookingContext): BookingSummaryView {
  const [outbound] = context.segments;
  const counts = countPassengers(booking.passengers);
  return {
    ...baseSummary(booking),
    title: outbound ? `${outbound.from.city} – ${outbound.to.city}` : "Vé máy bay",
    productHref: null,
    subtitle: `${booking.segments.length > 1 ? "Khứ hồi" : "Một chiều"} · ${cabinLabel(booking.cabin)}`,
    coverImage: context.image.imageUrl,
    coverImageAlt: context.image.imageAlt,
    highlights: [
      ...context.segments.map<BookingHighlight>((segment, index) => ({
        icon: "plane",
        text: `${SEGMENT_LABELS[index] ?? "Chặng"} ${formatDate(segment.date)} · ${segment.flightNumber} ${segment.departTime}`,
      })),
      { icon: "users", text: summarizePassengers(counts.adults, counts.children, counts.infants) },
    ],
  };
}

export function toFlightBookingDetailView(booking: FlightBooking, context: FlightBookingContext): BookingDetailView {
  const counts = countPassengers(booking.passengers);
  const priceLines = buildFareLines(booking.segments, counts);

  return {
    ...toFlightBookingSummaryView(booking, context),
    ...baseDetail(booking),
    priceLines,
    peopleHeading: `Hành khách (${booking.passengers.length})`,
    people: booking.passengers.map((p) => ({
      name: p.fullName,
      detail: `${PASSENGER_TYPE_LABEL[p.type]} · ${birthDetail(p.dateOfBirth).toLowerCase()}`,
    })),
    flightSegments: context.segments.map((segment, index) => ({ ...segment, label: SEGMENT_LABELS[index] ?? "Chặng" })),
  };
}
