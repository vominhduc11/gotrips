import type {
  BookingDetailResponse,
  BookingSummaryResponse,
  FlightBookingResponse,
  HotelBookingResponse,
  TourBookingResponse,
} from "@/lib/api/generated/model";
import { formatDate, formatDuration, formatVND } from "@/lib/format";
import { cabinLabel } from "@/lib/schemas/flight-search";
import { HERO_BANNER } from "@/lib/site-content";
import type {
  BookingDetailView,
  BookingFlightSegmentView,
  BookingHighlight,
  BookingKind,
  BookingPersonView,
  BookingPriceLine,
  BookingStatus,
  BookingSummaryView,
  PaymentStatus,
} from "@/lib/types";
import { toWebCabin, toWebPassengerType } from "./flight-request";
import { countPassengers, fareLineLabel, PASSENGER_TYPE_LABEL, SEGMENT_LABELS, summarizePassengers } from "./flight-view";

/**
 * Đổi đơn của API (dữ liệu có cấu trúc) sang View của trang "Đơn đặt chỗ của tôi" và trang chi tiết đơn: câu chữ giao
 * diện dựng ở đây, số tiền lấy nguyên từ API. Phần khác nhau theo loại dịch vụ quy về `highlights`, `priceLines`,
 * `people` (và `flightSegments`) nên `BookingHistory`/`BookingDetail` không rẽ nhánh theo loại.
 */

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
  TOUR: "Tour",
  HOTEL: "Khách sạn",
  FLIGHT: "Vé máy bay",
};

/** Tạm tính tiền tour trên giao diện = giá mỗi khách × số khách (tổng thật do API tính lúc tạo đơn). */
export function computeBookingTotal(unitPrice: number, guestCount: number): number {
  return unitPrice * guestCount;
}

/** Khối chi tiết phải có mặt đúng với `kind`; thiếu là API vi phạm hợp đồng nên báo lỗi rõ thay vì hiện đơn rỗng. */
function requireBlock<T>(block: T | undefined, booking: BookingSummaryResponse): T {
  if (!block) throw new Error(`Đơn ${booking.code} thiếu khối dữ liệu của loại ${booking.kind}.`);
  return block;
}

const birthDetail = (dateOfBirth: string | null) =>
  dateOfBirth ? `Sinh ngày ${formatDate(dateOfBirth)}` : "Chưa nhập ngày sinh";

/** Phần phụ thuộc loại dịch vụ: dùng chung cho dòng danh sách và trang chi tiết. */
interface KindView {
  title: string;
  productHref: string | null;
  subtitle: string;
  coverImage: string;
  coverImageAlt: string;
  /** Hiện ở cả danh sách. */
  highlights: BookingHighlight[];
  /** Thêm ở trang chi tiết. */
  detailHighlights: BookingHighlight[];
  priceLines: BookingPriceLine[];
  peopleHeading: string;
  people: BookingPersonView[];
  flightSegments: BookingFlightSegmentView[];
}

function tourView(tour: TourBookingResponse, totalAmount: number): KindView {
  return {
    title: tour.tourTitle,
    productHref: `/tours/${tour.tourSlug}`,
    subtitle: tour.destinationName,
    coverImage: tour.coverImage,
    coverImageAlt: tour.coverImageAlt,
    highlights: [
      { icon: "calendar", text: `Khởi hành ${formatDate(tour.departureDate)}` },
      { icon: "users", text: `${tour.guests} khách` },
    ],
    detailHighlights: [
      {
        icon: "clock",
        text: `${tour.durationDays} ngày ${tour.durationNights} đêm (${formatDuration(tour.durationDays, tour.durationNights)})`,
      },
      { icon: "compass", text: `Từ ${tour.departureCity}` },
    ],
    priceLines: [{ label: `${formatVND(tour.unitPrice)} × ${tour.guests} khách`, amount: totalAmount }],
    peopleHeading: `Người đi (${tour.travelers.length})`,
    people: tour.travelers.map((t) => ({ name: t.fullName, detail: birthDetail(t.dateOfBirth) })),
    flightSegments: [],
  };
}

function hotelView(hotel: HotelBookingResponse, totalAmount: number): KindView {
  return {
    title: hotel.hotelName,
    productHref: `/hotels/${hotel.hotelSlug}`,
    subtitle: hotel.destinationName,
    coverImage: hotel.imageUrl,
    coverImageAlt: hotel.imageAlt,
    highlights: [
      { icon: "calendar", text: `${formatDate(hotel.checkIn)} – ${formatDate(hotel.checkOut)} (${hotel.nights} đêm)` },
      { icon: "bed", text: `${hotel.rooms} × ${hotel.roomTypeName}` },
      { icon: "users", text: `${hotel.guests} khách` },
    ],
    detailHighlights: [
      { icon: "clock", text: `Nhận phòng từ ${hotel.checkInTime}, trả phòng trước ${hotel.checkOutTime}` },
      { icon: "compass", text: hotel.area },
    ],
    priceLines: [
      {
        label: `${formatVND(hotel.pricePerNight)} × ${hotel.nights} đêm × ${hotel.rooms} phòng`,
        amount: totalAmount,
      },
    ],
    peopleHeading: "Người nhận phòng",
    people: [{ name: hotel.guestName, detail: `${hotel.guests} khách · ${hotel.rooms} phòng` }],
    flightSegments: [],
  };
}

function flightView(flight: FlightBookingResponse): KindView {
  const cabin = toWebCabin(flight.cabin);
  const [outbound] = flight.segments;
  const passengers = flight.passengers.map((p) => ({ ...p, type: toWebPassengerType(p.type) }));
  const counts = countPassengers(passengers);

  return {
    title: outbound ? `${outbound.from.city} – ${outbound.to.city}` : "Vé máy bay",
    productHref: null,
    subtitle: `${flight.segments.length > 1 ? "Khứ hồi" : "Một chiều"} · ${cabinLabel(cabin)}`,
    // Không có chặng bay phổ biến nào tới điểm đến này thì dùng ảnh banner của website.
    coverImage: flight.imageUrl ?? HERO_BANNER.imageUrl,
    coverImageAlt: flight.imageAlt ?? HERO_BANNER.imageAlt,
    highlights: [
      ...flight.segments.map<BookingHighlight>((segment, index) => ({
        icon: "plane",
        text: `${SEGMENT_LABELS[index] ?? "Chặng"} ${formatDate(segment.date)} · ${segment.flightNumber} ${segment.departTime}`,
      })),
      { icon: "users", text: summarizePassengers(counts.adults, counts.children, counts.infants) },
    ],
    detailHighlights: [],
    priceLines: flight.priceLines.map((line) => ({
      label: fareLineLabel(line.segmentIndex, line.unitPrice, line.quantity, toWebPassengerType(line.passengerType)),
      amount: line.amount,
    })),
    peopleHeading: `Hành khách (${passengers.length})`,
    people: passengers.map((p) => ({
      name: p.fullName,
      detail: `${PASSENGER_TYPE_LABEL[p.type]} · ${birthDetail(p.dateOfBirth).toLowerCase()}`,
    })),
    flightSegments: flight.segments.map((segment, index) => ({
      ...segment,
      cabin,
      label: SEGMENT_LABELS[index] ?? "Chặng",
    })),
  };
}

function kindView(booking: BookingSummaryResponse): KindView {
  switch (booking.kind) {
    case "TOUR":
      return tourView(requireBlock(booking.tour, booking), booking.totalAmount);
    case "HOTEL":
      return hotelView(requireBlock(booking.hotel, booking), booking.totalAmount);
    case "FLIGHT":
      return flightView(requireBlock(booking.flight, booking));
  }
}

function summaryOf(booking: BookingSummaryResponse, view: KindView): BookingSummaryView {
  return {
    code: booking.code,
    kind: booking.kind,
    kindLabel: BOOKING_KIND_LABEL[booking.kind],
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    totalAmount: booking.totalAmount,
    createdAt: booking.createdAt,
    title: view.title,
    productHref: view.productHref,
    subtitle: view.subtitle,
    coverImage: view.coverImage,
    coverImageAlt: view.coverImageAlt,
    highlights: view.highlights,
  };
}

export function toBookingSummaryView(booking: BookingSummaryResponse): BookingSummaryView {
  return summaryOf(booking, kindView(booking));
}

export function toBookingDetailView(booking: BookingDetailResponse): BookingDetailView {
  const view = kindView(booking);
  return {
    ...summaryOf(booking, view),
    highlights: [...view.highlights, ...view.detailHighlights],
    priceLines: view.priceLines,
    peopleHeading: view.peopleHeading,
    people: view.people,
    flightSegments: view.flightSegments,
    contact: booking.contact,
    note: booking.note,
    paidAt: booking.paidAt,
    confirmedAt: booking.confirmedAt,
    cancelledAt: booking.cancelledAt,
    // Huỷ đơn đã trả tiền: khoản thu vẫn PAID để nhân viên hoàn tiền thủ công.
    needsRefund: booking.status === "CANCELLED" && booking.paymentStatus === "PAID",
    bankTransfer: booking.bankTransfer,
  };
}
