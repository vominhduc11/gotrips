import { describe, expect, it } from "vitest";
import { makeBooking, makeFlightBooking, makeHotelBooking } from "@/lib/booking/test-fixtures";
import { airports } from "@/lib/mock/airports";
import { airlines, flightSchedules } from "@/lib/mock/flights";
import type { Destination, FlightOptionView, Hotel, HotelRoomType, Tour, TourDeparture } from "@/lib/types";
import {
  BOOKING_KIND_LABEL,
  BOOKING_STATUS_BADGE,
  PAYMENT_STATUS_BADGE,
  computeBookingTotal,
  toFlightBookingDetailView,
  toFlightBookingSummaryView,
  toHotelBookingDetailView,
  toHotelBookingSummaryView,
  toTourBookingDetailView,
  toTourBookingSummaryView,
} from "./booking-view";
import { findFlightOption } from "./flight-view";

const destination: Destination = {
  id: 2,
  slug: "phu-quoc",
  name: "Phú Quốc",
  region: "Tây Nam Bộ",
  imageUrl: "https://images.unsplash.com/photo-x",
  imageAlt: "Biển",
};

const tour: Tour = {
  id: 3,
  slug: "phu-quoc-4n3d",
  title: "Phú Quốc 4N3Đ",
  destinationId: 2,
  durationDays: 4,
  durationNights: 3,
  departureCity: "TP. Hồ Chí Minh",
  shortDescription: "",
  coverImage: "https://images.unsplash.com/photo-y",
  coverImageAlt: "Bãi biển",
  rating: 4.7,
  reviewCount: 10,
  isFeatured: true,
  status: "ACTIVE",
};

const departure: TourDeparture = {
  id: 8,
  tourId: 3,
  departureDate: "2027-01-14",
  price: 8_990_000,
  totalSeats: 24,
  bookedSeats: 14,
};

describe("computeBookingTotal", () => {
  it("= giá mỗi khách × số khách", () => {
    expect(computeBookingTotal(8_990_000, 3)).toBe(26_970_000);
  });
});

describe("nhãn trạng thái", () => {
  it("đủ nhãn tiếng Việt cho mọi trạng thái đơn và thanh toán", () => {
    expect(BOOKING_STATUS_BADGE.PENDING.label).toBe("Chờ xác nhận");
    expect(BOOKING_STATUS_BADGE.CONFIRMED.label).toBe("Đã xác nhận");
    expect(BOOKING_STATUS_BADGE.CANCELLED.label).toBe("Đã huỷ");
    expect(PAYMENT_STATUS_BADGE.UNPAID.label).toBe("Chưa thanh toán");
    expect(PAYMENT_STATUS_BADGE.PAID.label).toBe("Đã thanh toán");
  });
});

describe("đơn tour", () => {
  const context = { tour, destination, departure };

  it("dòng lịch sử: tiêu đề, liên kết tour, điểm đến, ngày khởi hành, số khách", () => {
    expect(toTourBookingSummaryView(makeBooking(), context)).toMatchObject({
      code: "GT7K4Q2M",
      kind: "tour",
      kindLabel: "Tour",
      status: "PENDING",
      paymentStatus: "UNPAID",
      title: "Phú Quốc 4N3Đ",
      productHref: "/tours/phu-quoc-4n3d",
      subtitle: "Phú Quốc",
      highlights: [
        { icon: "calendar", text: "Khởi hành 14/01/2027" },
        { icon: "users", text: "2 khách" },
      ],
      totalAmount: 17_980_000,
    });
  });

  it("chi tiết: thời gian tour, nơi khởi hành, dòng tính tiền, người đi", () => {
    const view = toTourBookingDetailView(makeBooking(), context);
    expect(view.highlights.map((h) => h.text)).toEqual([
      "Khởi hành 14/01/2027",
      "2 khách",
      "4 ngày 3 đêm (4N3Đ)",
      "Từ TP. Hồ Chí Minh",
    ]);
    expect(view.priceLines).toEqual([{ label: "8.990.000\u00a0₫ × 2 khách", amount: 17_980_000 }]);
    expect(view.peopleHeading).toBe("Người đi (2)");
    expect(view.people).toEqual([
      { name: "Nguyễn Minh Anh", detail: "Sinh ngày 12/04/1995" },
      { name: "Trần Văn Bình", detail: "Chưa nhập ngày sinh" },
    ]);
    expect(view.flightSegments).toEqual([]);
  });

  it("needsRefund chỉ khi đơn đã huỷ mà khoản thanh toán đã thu", () => {
    const paid = { method: "BANK_TRANSFER" as const, amount: 17_980_000, status: "PAID" as const, paidAt: "2026-11-23T05:00:00.000Z" };
    const view = (patch: Parameters<typeof makeBooking>[0]) => toTourBookingDetailView(makeBooking(patch), context);

    expect(view({ status: "CANCELLED", payment: paid }).needsRefund).toBe(true);
    expect(view({ status: "CONFIRMED", payment: paid }).needsRefund).toBe(false);
    expect(view({ status: "CANCELLED" }).needsRefund).toBe(false);
    expect(view({ status: "CANCELLED", payment: paid }).paidAt).toBe(paid.paidAt);
  });
});

describe("đơn khách sạn", () => {
  const hotel: Hotel = {
    id: 1,
    slug: "khach-san-doi-may-da-lat",
    name: "Khách sạn Đồi Mây",
    destinationId: 2,
    starRating: 4,
    area: "Phường 3, Đà Lạt",
    imageUrl: "https://images.unsplash.com/photo-h",
    imageAlt: "Hồ bơi",
    status: "ACTIVE",
    rating: 4.6,
    reviewCount: 10,
    description: "",
    amenities: [],
    checkInTime: "14:00",
    checkOutTime: "12:00",
  };
  const roomType: HotelRoomType = {
    id: 1,
    hotelId: 1,
    name: "Phòng Deluxe",
    pricePerNight: 1_250_000,
    maxGuests: 2,
    bedType: "1 giường đôi lớn",
    areaM2: 28,
  };
  const context = { hotel, destination, roomType };

  it("dòng lịch sử: tên khách sạn, liên kết, kỳ lưu trú, phòng, số khách", () => {
    expect(toHotelBookingSummaryView(makeHotelBooking(), context)).toMatchObject({
      kind: "hotel",
      kindLabel: "Khách sạn",
      title: "Khách sạn Đồi Mây",
      productHref: "/hotels/khach-san-doi-may-da-lat",
      coverImage: "https://images.unsplash.com/photo-h",
      highlights: [
        { icon: "calendar", text: "10/01/2027 – 12/01/2027 (2 đêm)" },
        { icon: "bed", text: "1 × Phòng Deluxe" },
        { icon: "users", text: "2 khách" },
      ],
    });
  });

  it("chi tiết: giờ nhận/trả phòng, dòng tính tiền theo đêm × phòng, người nhận phòng", () => {
    const view = toHotelBookingDetailView(makeHotelBooking({ rooms: 2, totalAmount: 5_000_000 }), context);
    expect(view.highlights.at(-2)?.text).toBe("Nhận phòng từ 14:00, trả phòng trước 12:00");
    expect(view.priceLines).toEqual([{ label: "1.250.000\u00a0₫ × 2 đêm × 2 phòng", amount: 5_000_000 }]);
    expect(view.peopleHeading).toBe("Người nhận phòng");
    expect(view.people).toEqual([{ name: "Nguyễn Minh Anh", detail: "2 khách · 2 phòng" }]);
  });
});

describe("đơn vé máy bay", () => {
  const booking = makeFlightBooking();
  const segments = booking.segments.map((segment) => {
    const schedule = flightSchedules.find((s) => s.id === segment.scheduleId)!;
    return findFlightOption(flightSchedules, airlines, airports, {
      scheduleId: schedule.id,
      from: schedule.fromCode,
      to: schedule.toCode,
      date: segment.date,
      cabin: booking.cabin,
    }) as FlightOptionView;
  });
  const context = { segments, image: { imageUrl: "https://images.unsplash.com/photo-f", imageAlt: "Hà Nội" } };

  it("dòng lịch sử: chặng bay, khứ hồi, từng chiều, hành khách; không có trang sản phẩm", () => {
    expect(toFlightBookingSummaryView(booking, context)).toMatchObject({
      kind: "flight",
      kindLabel: BOOKING_KIND_LABEL.flight,
      title: "TP. Hồ Chí Minh – Hà Nội",
      subtitle: "Khứ hồi · Phổ thông",
      productHref: null,
      highlights: [
        { icon: "plane", text: "Chiều đi 10/01/2027 · MT113 08:30" },
        { icon: "plane", text: "Chiều về 15/01/2027 · CD306 15:40" },
        { icon: "users", text: "1 người lớn, 1 em bé" },
      ],
    });
  });

  it("chi tiết: tính tiền theo giá đã chốt lúc đặt (không theo giá hiện tại), hành khách, chặng bay", () => {
    const view = toFlightBookingDetailView(booking, context);
    expect(view.priceLines).toEqual([
      { label: "Chiều đi: 1.490.000\u00a0₫ × 1 người lớn", amount: 1_490_000 },
      { label: "Chiều đi: 149.000\u00a0₫ × 1 em bé", amount: 149_000 },
      { label: "Chiều về: 1.350.000\u00a0₫ × 1 người lớn", amount: 1_350_000 },
      { label: "Chiều về: 135.000\u00a0₫ × 1 em bé", amount: 135_000 },
    ]);
    expect(view.priceLines.reduce((sum, line) => sum + line.amount, 0)).toBe(booking.totalAmount);
    expect(view.peopleHeading).toBe("Hành khách (2)");
    expect(view.people).toEqual([
      { name: "Nguyễn Minh Anh", detail: "Người lớn · chưa nhập ngày sinh" },
      { name: "Nguyễn Bảo An", detail: "Em bé · sinh ngày 01/03/2026" },
    ]);
    expect(view.flightSegments.map((s) => [s.label, s.flightNumber])).toEqual([
      ["Chiều đi", "MT113"],
      ["Chiều về", "CD306"],
    ]);
  });
});
