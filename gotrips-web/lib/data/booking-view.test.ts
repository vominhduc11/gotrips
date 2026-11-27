import { describe, expect, it } from "vitest";
import type {
  BookingDetailResponse,
  FlightBookingResponse,
  FlightSegmentResponse,
  HotelBookingResponse,
  TourBookingResponse,
} from "@/lib/api/generated/model";
import { HERO_BANNER } from "@/lib/site-content";
import {
  BOOKING_STATUS_BADGE,
  computeBookingTotal,
  PAYMENT_STATUS_BADGE,
  toBookingDetailView,
  toBookingSummaryView,
} from "./booking-view";

/** Phần chung của một đơn chi tiết như API trả về; từng test chọn `kind` và khối tương ứng. */
function makeBooking(patch: Partial<BookingDetailResponse> & Pick<BookingDetailResponse, "kind">): BookingDetailResponse {
  return {
    code: "GT7K4Q2M",
    status: "PENDING",
    paymentStatus: "UNPAID",
    totalAmount: 17_980_000,
    createdAt: "2026-11-23T03:00:00Z",
    contact: { fullName: "Nguyễn Minh Anh", email: "minhanh@example.com", phone: "0901 234 567" },
    note: null,
    paidAt: null,
    confirmedAt: null,
    cancelledAt: null,
    bankTransfer: { bankName: "NH Test", accountNumber: "0000 1111", accountName: "GOTRIPS", content: "GT7K4Q2M" },
    ...patch,
  };
}

const tour: TourBookingResponse = {
  departureId: 8,
  tourSlug: "phu-quoc-4n3d",
  tourTitle: "Phú Quốc 4N3Đ",
  destinationName: "Phú Quốc",
  coverImage: "https://images.unsplash.com/photo-y",
  coverImageAlt: "Bãi biển",
  departureCity: "TP. Hồ Chí Minh",
  durationDays: 4,
  durationNights: 3,
  departureDate: "2027-01-14",
  guests: 2,
  unitPrice: 8_990_000,
  travelers: [
    { fullName: "Nguyễn Minh Anh", dateOfBirth: "1995-04-12" },
    { fullName: "Trần Văn Bình", dateOfBirth: null },
  ],
};

const hotel: HotelBookingResponse = {
  roomTypeId: 1,
  roomTypeName: "Phòng Deluxe",
  hotelSlug: "khach-san-doi-may-da-lat",
  hotelName: "Khách sạn Đồi Mây",
  destinationName: "Đà Lạt",
  area: "Phường 3, Đà Lạt",
  imageUrl: "https://images.unsplash.com/photo-h",
  imageAlt: "Hồ bơi",
  checkInTime: "14:00",
  checkOutTime: "12:00",
  checkIn: "2027-01-10",
  checkOut: "2027-01-12",
  nights: 2,
  rooms: 2,
  guests: 2,
  pricePerNight: 1_250_000,
  guestName: "Nguyễn Minh Anh",
};

function segment(patch: Partial<FlightSegmentResponse> & Pick<FlightSegmentResponse, "flightNumber">): FlightSegmentResponse {
  return {
    scheduleId: 2,
    airline: { code: "MT", name: "Mây Trời Airlines" },
    from: { code: "SGN", name: "Sân bay Tân Sơn Nhất", city: "TP. Hồ Chí Minh" },
    to: { code: "HAN", name: "Sân bay Nội Bài", city: "Hà Nội" },
    date: "2027-01-10",
    departTime: "08:30",
    arriveTime: "10:35",
    arrivesNextDay: false,
    durationMinutes: 125,
    fares: { adult: 1_490_000, child: 1_118_000, infant: 149_000 },
    ...patch,
  };
}

const flight: FlightBookingResponse = {
  cabin: "ECONOMY",
  imageUrl: "https://images.unsplash.com/photo-f",
  imageAlt: "Hà Nội",
  segments: [
    segment({ flightNumber: "MT113" }),
    segment({ scheduleId: 7, flightNumber: "CD306", date: "2027-01-15", departTime: "15:40", arriveTime: "17:50" }),
  ],
  passengers: [
    { type: "ADULT", fullName: "Nguyễn Minh Anh", dateOfBirth: null },
    { type: "INFANT", fullName: "Nguyễn Bảo An", dateOfBirth: "2026-03-01" },
  ],
  priceLines: [
    { segmentIndex: 0, passengerType: "ADULT", unitPrice: 1_490_000, quantity: 1, amount: 1_490_000 },
    { segmentIndex: 0, passengerType: "INFANT", unitPrice: 149_000, quantity: 1, amount: 149_000 },
    { segmentIndex: 1, passengerType: "ADULT", unitPrice: 1_350_000, quantity: 1, amount: 1_350_000 },
    { segmentIndex: 1, passengerType: "INFANT", unitPrice: 135_000, quantity: 1, amount: 135_000 },
  ],
};

describe("computeBookingTotal", () => {
  it("tạm tính = giá mỗi khách × số khách", () => {
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
  const booking = makeBooking({ kind: "TOUR", tour });

  it("dòng lịch sử: tiêu đề, liên kết tour, điểm đến, ngày khởi hành, số khách; không mang người liên hệ", () => {
    const view = toBookingSummaryView(booking);
    expect(view).toEqual({
      code: "GT7K4Q2M",
      kind: "TOUR",
      kindLabel: "Tour",
      status: "PENDING",
      paymentStatus: "UNPAID",
      totalAmount: 17_980_000,
      createdAt: "2026-11-23T03:00:00Z",
      title: "Phú Quốc 4N3Đ",
      productHref: "/tours/phu-quoc-4n3d",
      subtitle: "Phú Quốc",
      coverImage: "https://images.unsplash.com/photo-y",
      coverImageAlt: "Bãi biển",
      highlights: [
        { icon: "calendar", text: "Khởi hành 14/01/2027" },
        { icon: "users", text: "2 khách" },
      ],
    });
  });

  it("chi tiết: thời gian tour, nơi khởi hành, dòng tính tiền theo đơn giá đã chốt, người đi, chuyển khoản", () => {
    const view = toBookingDetailView(booking);
    expect(view.highlights.map((h) => h.text)).toEqual([
      "Khởi hành 14/01/2027",
      "2 khách",
      "4 ngày 3 đêm (4N3Đ)",
      "Từ TP. Hồ Chí Minh",
    ]);
    expect(view.priceLines).toEqual([{ label: "8.990.000 ₫ × 2 khách", amount: 17_980_000 }]);
    expect(view.peopleHeading).toBe("Người đi (2)");
    expect(view.people).toEqual([
      { name: "Nguyễn Minh Anh", detail: "Sinh ngày 12/04/1995" },
      { name: "Trần Văn Bình", detail: "Chưa nhập ngày sinh" },
    ]);
    expect(view.flightSegments).toEqual([]);
    expect(view.bankTransfer.content).toBe("GT7K4Q2M");
    expect(view.contact.phone).toBe("0901 234 567");
  });

  it("needsRefund chỉ khi đơn đã huỷ mà khoản thanh toán đã thu", () => {
    const view = (patch: Partial<BookingDetailResponse>) => toBookingDetailView({ ...booking, ...patch });
    const paidAt = "2026-11-23T05:00:00Z";

    expect(view({ status: "CANCELLED", paymentStatus: "PAID", paidAt }).needsRefund).toBe(true);
    expect(view({ status: "CONFIRMED", paymentStatus: "PAID", paidAt }).needsRefund).toBe(false);
    expect(view({ status: "CANCELLED", paymentStatus: "CANCELLED" }).needsRefund).toBe(false);
    expect(view({ status: "CANCELLED", paymentStatus: "PAID", paidAt }).paidAt).toBe(paidAt);
  });

  it("thiếu khối dữ liệu đúng loại thì báo lỗi rõ thay vì hiện đơn rỗng", () => {
    expect(() => toBookingSummaryView(makeBooking({ kind: "TOUR" }))).toThrow(/GT7K4Q2M thiếu khối dữ liệu/);
  });
});

describe("đơn khách sạn", () => {
  const booking = makeBooking({ kind: "HOTEL", totalAmount: 5_000_000, hotel });

  it("dòng lịch sử: tên khách sạn, liên kết, kỳ lưu trú, phòng, số khách", () => {
    expect(toBookingSummaryView(booking)).toMatchObject({
      kind: "HOTEL",
      kindLabel: "Khách sạn",
      title: "Khách sạn Đồi Mây",
      productHref: "/hotels/khach-san-doi-may-da-lat",
      subtitle: "Đà Lạt",
      coverImage: "https://images.unsplash.com/photo-h",
      highlights: [
        { icon: "calendar", text: "10/01/2027 – 12/01/2027 (2 đêm)" },
        { icon: "bed", text: "2 × Phòng Deluxe" },
        { icon: "users", text: "2 khách" },
      ],
    });
  });

  it("chi tiết: giờ nhận/trả phòng, khu vực, dòng tính tiền theo đêm × phòng, người nhận phòng", () => {
    const view = toBookingDetailView(booking);
    expect(view.highlights.slice(-2).map((h) => h.text)).toEqual([
      "Nhận phòng từ 14:00, trả phòng trước 12:00",
      "Phường 3, Đà Lạt",
    ]);
    expect(view.priceLines).toEqual([{ label: "1.250.000 ₫ × 2 đêm × 2 phòng", amount: 5_000_000 }]);
    expect(view.peopleHeading).toBe("Người nhận phòng");
    expect(view.people).toEqual([{ name: "Nguyễn Minh Anh", detail: "2 khách · 2 phòng" }]);
  });
});

describe("đơn vé máy bay", () => {
  const booking = makeBooking({ kind: "FLIGHT", totalAmount: 3_124_000, flight });

  it("dòng lịch sử: chặng bay, khứ hồi, từng chiều, hành khách; không có trang sản phẩm", () => {
    expect(toBookingSummaryView(booking)).toMatchObject({
      kind: "FLIGHT",
      kindLabel: "Vé máy bay",
      title: "TP. Hồ Chí Minh – Hà Nội",
      subtitle: "Khứ hồi · Phổ thông",
      productHref: null,
      coverImage: "https://images.unsplash.com/photo-f",
      highlights: [
        { icon: "plane", text: "Chiều đi 10/01/2027 · MT113 08:30" },
        { icon: "plane", text: "Chiều về 15/01/2027 · CD306 15:40" },
        { icon: "users", text: "1 người lớn, 1 em bé" },
      ],
    });
  });

  it("chi tiết: dòng tính tiền lấy số tiền từ API, hành khách, chặng bay kèm hạng ghế của web", () => {
    const view = toBookingDetailView(booking);
    expect(view.priceLines).toEqual([
      { label: "Chiều đi: 1.490.000 ₫ × 1 người lớn", amount: 1_490_000 },
      { label: "Chiều đi: 149.000 ₫ × 1 em bé", amount: 149_000 },
      { label: "Chiều về: 1.350.000 ₫ × 1 người lớn", amount: 1_350_000 },
      { label: "Chiều về: 135.000 ₫ × 1 em bé", amount: 135_000 },
    ]);
    expect(view.priceLines.reduce((sum, line) => sum + line.amount, 0)).toBe(booking.totalAmount);
    expect(view.peopleHeading).toBe("Hành khách (2)");
    expect(view.people).toEqual([
      { name: "Nguyễn Minh Anh", detail: "Người lớn · chưa nhập ngày sinh" },
      { name: "Nguyễn Bảo An", detail: "Em bé · sinh ngày 01/03/2026" },
    ]);
    expect(view.flightSegments.map((s) => [s.label, s.flightNumber, s.cabin])).toEqual([
      ["Chiều đi", "MT113", "economy"],
      ["Chiều về", "CD306", "economy"],
    ]);
  });

  it("một chiều, điểm đến không có ảnh → dùng ảnh banner của website", () => {
    const oneWay = makeBooking({
      kind: "FLIGHT",
      flight: { ...flight, imageUrl: null, imageAlt: null, segments: [flight.segments[0]!] },
    });
    expect(toBookingSummaryView(oneWay)).toMatchObject({
      subtitle: "Một chiều · Phổ thông",
      coverImage: HERO_BANNER.imageUrl,
      coverImageAlt: HERO_BANNER.imageAlt,
    });
  });
});
