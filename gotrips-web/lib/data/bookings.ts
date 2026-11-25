import "server-only";

/**
 * Lớp truy cập dữ liệu đơn đặt chỗ (tour, khách sạn, vé máy bay). Component chỉ import từ đây (như `home.ts`, `tours.ts`).
 *
 * PROTOTYPE: đơn nằm trong cookie (`lib/booking/demo-store.ts`), tour/khách sạn/lịch bay lấy từ mock. Khi có gotrips-api
 * chỉ đổi thân hàm sang gọi API (`/me/bookings`...) bằng token trong cookie phiên, giữ nguyên chữ ký.
 *
 * Đơn là dữ liệu riêng từng người, đọc từ cookie theo từng request, nên KHÔNG đặt trong `"use cache"`; component gọi
 * các hàm này phải nằm trong `<Suspense>`.
 */
import { cacheLife, cacheTag } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { readStoredBookings } from "@/lib/booking/demo-store";
import { airports } from "@/lib/mock/airports";
import { departures } from "@/lib/mock/departures";
import { destinations } from "@/lib/mock/destinations";
import { flightRoutes } from "@/lib/mock/flight-routes";
import { airlines, flightSchedules } from "@/lib/mock/flights";
import { hotelRoomTypes } from "@/lib/mock/hotel-room-types";
import { hotels } from "@/lib/mock/hotels";
import { bankTransferInfo, heroBanner } from "@/lib/mock/site";
import { tours } from "@/lib/mock/tours";
import type {
  BankTransferInfo,
  Booking,
  BookingDetailView,
  BookingSummaryView,
  CabinClassValue,
  FlightBooking,
  FlightOptionView,
  HotelBooking,
  HotelRoomType,
  TourBooking,
  TourDeparture,
} from "@/lib/types";
import {
  toFlightBookingDetailView,
  toFlightBookingSummaryView,
  toHotelBookingDetailView,
  toHotelBookingSummaryView,
  toTourBookingDetailView,
  toTourBookingSummaryView,
  type FlightBookingContext,
  type HotelBookingContext,
  type TourBookingContext,
} from "./booking-view";
import { findFlightOption, findRouteImage } from "./flight-view";
import { getSeatsLeft } from "./tour-view";

/** Tour + điểm đến + chuyến của một đơn tour. Đơn trỏ tới chuyến đã bị xoá khỏi dữ liệu thì bỏ qua. */
function findTourContext(booking: TourBooking): TourBookingContext | null {
  const departure = departures.find((d) => d.id === booking.departureId);
  const tour = departure && tours.find((t) => t.id === departure.tourId);
  const destination = tour && destinations.find((d) => d.id === tour.destinationId);
  return departure && tour && destination ? { tour, destination, departure } : null;
}

/** Khách sạn + điểm đến + loại phòng của một đơn khách sạn (khách sạn đã ẩn vẫn hiện trong đơn cũ). */
function findHotelContext(booking: HotelBooking): HotelBookingContext | null {
  const hotel = hotels.find((h) => h.id === booking.hotelId);
  const roomType = hotel && hotelRoomTypes.find((r) => r.id === booking.roomTypeId && r.hotelId === hotel.id);
  const destination = hotel && destinations.find((d) => d.id === hotel.destinationId);
  return hotel && roomType && destination ? { hotel, destination, roomType } : null;
}

/** Các chặng bay của một đơn vé (theo lịch bay + ngày đã lưu). Thiếu một chặng (lịch bay đã bị xoá) → bỏ đơn. */
function findFlightContext(booking: FlightBooking): FlightBookingContext | null {
  const segments: FlightOptionView[] = [];
  for (const segment of booking.segments) {
    const schedule = flightSchedules.find((s) => s.id === segment.scheduleId);
    const view =
      schedule &&
      findFlightOption(flightSchedules, airlines, airports, {
        scheduleId: schedule.id,
        from: schedule.fromCode,
        to: schedule.toCode,
        date: segment.date,
        cabin: booking.cabin,
      });
    if (!view) return null;
    segments.push(view);
  }
  const image = findRouteImage(flightRoutes, segments[0]?.to.code ?? "", heroBanner);
  return { segments, image };
}

function toSummaryView(booking: Booking): BookingSummaryView | null {
  switch (booking.kind) {
    case "tour": {
      const context = findTourContext(booking);
      return context ? toTourBookingSummaryView(booking, context) : null;
    }
    case "hotel": {
      const context = findHotelContext(booking);
      return context ? toHotelBookingSummaryView(booking, context) : null;
    }
    case "flight": {
      const context = findFlightContext(booking);
      return context ? toFlightBookingSummaryView(booking, context) : null;
    }
  }
}

function toDetailView(booking: Booking): BookingDetailView | null {
  switch (booking.kind) {
    case "tour": {
      const context = findTourContext(booking);
      return context ? toTourBookingDetailView(booking, context) : null;
    }
    case "hotel": {
      const context = findHotelContext(booking);
      return context ? toHotelBookingDetailView(booking, context) : null;
    }
    case "flight": {
      const context = findFlightContext(booking);
      return context ? toFlightBookingDetailView(booking, context) : null;
    }
  }
}

/** Đơn của người đang đăng nhập (mới nhất trước); chưa đăng nhập thì rỗng. */
async function getOwnBookings(): Promise<Booking[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const email = user.email.toLowerCase();
  return (await readStoredBookings()).filter((booking) => booking.ownerEmail.toLowerCase() === email);
}

/** Mọi đơn (tour, khách sạn, vé máy bay) của người đang đăng nhập, mới nhất trước. */
export async function getMyBookings(): Promise<BookingSummaryView[]> {
  return (await getOwnBookings()).flatMap((booking) => {
    const view = toSummaryView(booking);
    return view ? [view] : [];
  });
}

/** Chi tiết một đơn; `null` nếu không có hoặc không phải đơn của người đang đăng nhập (trang trả 404, không lộ đơn người khác). */
export async function getMyBooking(code: string): Promise<BookingDetailView | null> {
  const booking = (await getOwnBookings()).find((b) => b.code === code);
  return booking ? toDetailView(booking) : null;
}

/**
 * Chuyến khởi hành mà Server Action dùng để tính giá và kiểm chỗ. `null` nếu tour không hiển thị (HIDDEN) hoặc chuyến
 * không thuộc tour đó. Việc kiểm "đã qua ngày"/"đủ chỗ" do action làm (cần thông báo lỗi khác nhau).
 */
export async function getDepartureForBooking(
  tourSlug: string,
  departureId: number,
): Promise<{ departure: TourDeparture; seatsLeft: number } | null> {
  const tour = tours.find((t) => t.slug === tourSlug && t.status === "ACTIVE");
  const departure = tour && departures.find((d) => d.id === departureId && d.tourId === tour.id);
  return departure ? { departure, seatsLeft: getSeatsLeft(departure) } : null;
}

/**
 * Khách sạn + loại phòng mà Server Action đặt phòng dùng để kiểm sức chứa và tính giá. `null` nếu khách sạn không hiển
 * thị (HIDDEN) hoặc không có. Trả cả danh sách loại phòng để dựng schema kiểm lựa chọn.
 */
export async function getHotelForBooking(
  hotelSlug: string,
): Promise<{ hotelId: number; roomTypes: HotelRoomType[] } | null> {
  const hotel = hotels.find((h) => h.slug === hotelSlug && h.status === "ACTIVE");
  if (!hotel) return null;
  const roomTypes = hotelRoomTypes.filter((r) => r.hotelId === hotel.id);
  return roomTypes.length > 0 ? { hotelId: hotel.id, roomTypes } : null;
}

/** Chuyến bay cụ thể cho Server Action đặt vé (đúng chiều, đúng hạng ghế); `null` nếu id không khớp chặng. */
export async function getFlightForBooking(query: {
  scheduleId: number;
  from: string;
  to: string;
  date: string;
  cabin: CabinClassValue;
}): Promise<FlightOptionView | null> {
  return findFlightOption(flightSchedules, airlines, airports, query);
}

/** Tài khoản nhận chuyển khoản (dữ liệu thử nghiệm). */
export async function getBankTransferInfo(): Promise<BankTransferInfo> {
  "use cache";
  cacheLife("days");
  cacheTag("site");

  return bankTransferInfo;
}
