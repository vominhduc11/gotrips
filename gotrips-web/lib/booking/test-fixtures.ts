import type { FlightBooking, HotelBooking, TourBooking } from "@/lib/types";

/** Đơn mẫu cho unit test (không phải file test — chỉ được các `*.test.ts` import). */

const base = {
  ownerEmail: "test@gmail.com",
  contact: { fullName: "Nguyễn Minh Anh", email: "test@gmail.com", phone: "0901 234 567" },
  note: null,
  status: "PENDING" as const,
  createdAt: "2026-11-23T03:00:00.000Z",
  confirmedAt: null,
  cancelledAt: null,
};

export function makeBooking(patch: Partial<TourBooking> = {}): TourBooking {
  return {
    ...base,
    kind: "tour",
    code: "GT7K4Q2M",
    departureId: 8,
    guestCount: 2,
    unitPrice: 8_990_000,
    totalAmount: 17_980_000,
    travelers: [
      { fullName: "Nguyễn Minh Anh", dateOfBirth: "1995-04-12" },
      { fullName: "Trần Văn Bình", dateOfBirth: null },
    ],
    payment: { method: "BANK_TRANSFER", amount: 17_980_000, status: "UNPAID", paidAt: null },
    ...patch,
  };
}

/** Khách sạn Đồi Mây (id 1), Phòng Deluxe (id 1, 1.250.000 ₫/đêm): 2 đêm × 1 phòng. */
export function makeHotelBooking(patch: Partial<HotelBooking> = {}): HotelBooking {
  return {
    ...base,
    kind: "hotel",
    code: "GTH2T3K4",
    hotelId: 1,
    roomTypeId: 1,
    checkIn: "2027-01-10",
    checkOut: "2027-01-12",
    nights: 2,
    rooms: 1,
    guestCount: 2,
    pricePerNight: 1_250_000,
    guestName: "Nguyễn Minh Anh",
    totalAmount: 2_500_000,
    payment: { method: "BANK_TRANSFER", amount: 2_500_000, status: "UNPAID", paidAt: null },
    ...patch,
  };
}

/** Khứ hồi SGN → HAN (lịch bay 2, MT113) và HAN → SGN (lịch bay 7, CD306), hạng Phổ thông, 1 người lớn + 1 em bé. */
export function makeFlightBooking(patch: Partial<FlightBooking> = {}): FlightBooking {
  return {
    ...base,
    kind: "flight",
    code: "GTF5G6H7",
    cabin: "economy",
    segments: [
      { scheduleId: 2, date: "2027-01-10", fares: { adult: 1_490_000, child: 1_118_000, infant: 149_000 } },
      { scheduleId: 7, date: "2027-01-15", fares: { adult: 1_350_000, child: 1_013_000, infant: 135_000 } },
    ],
    passengers: [
      { type: "adult", fullName: "Nguyễn Minh Anh", dateOfBirth: null },
      { type: "infant", fullName: "Nguyễn Bảo An", dateOfBirth: "2026-03-01" },
    ],
    totalAmount: 3_124_000,
    payment: { method: "BANK_TRANSFER", amount: 3_124_000, status: "UNPAID", paidAt: null },
    ...patch,
  };
}
