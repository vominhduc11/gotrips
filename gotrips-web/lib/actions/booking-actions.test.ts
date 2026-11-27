import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FlightOptionResponse } from "@/lib/api/generated/model";
import { getTodayInVietnam } from "@/lib/data/tour-view";
import { addDaysToIsoDate } from "@/lib/iso-date";

vi.mock("server-only", () => ({}));
// `after` chạy callback ngay để kiểm việc làm mới cache; `redirect` ném lỗi như thật (để biết đã chuyển hướng tới đâu).
vi.mock("next/server", () => ({ after: (callback: () => void) => callback() }));
const { revalidateTag, redirect } = vi.hoisted(() => ({
  revalidateTag: vi.fn(),
  redirect: vi.fn((url: string): never => {
    throw new Error(`REDIRECT ${url}`);
  }),
}));
vi.mock("next/cache", () => ({ revalidateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect, unstable_rethrow: vi.fn() }));

const { getSessionToken, getCurrentUser } = vi.hoisted(() => ({
  getSessionToken: vi.fn<() => Promise<string | undefined>>(),
  getCurrentUser: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ getSessionToken, getCurrentUser }));

const api = vi.hoisted(() => ({
  createTourBooking: vi.fn(),
  createHotelBooking: vi.fn(),
  createFlightBooking: vi.fn(),
  getHotel: vi.fn(),
  getFlight: vi.fn(),
}));
vi.mock("@/lib/api/generated", () => api);

import { ApiError } from "@/lib/api/http";
import { createBookingAction } from "./booking";
import { createFlightBookingAction, startFlightBookingAction } from "./flight-booking";
import { createHotelBookingAction } from "./hotel-booking";
import { SERVICE_UNAVAILABLE_MESSAGE } from "./messages";

const today = getTodayInVietnam();
/** Ngày xa trong tương lai (tính từ hôm nay để test không hỏng khi thời gian trôi). */
const DEPART = addDaysToIsoDate(today, 200);
const RETURN = addDaysToIsoDate(today, 205);

const contact = { fullName: "Nguyễn Minh Anh", email: "bi-mat@example.com", phone: "0901 234 567" };

const tourForm = {
  tourSlug: "phu-quoc-4n3d",
  departureId: 8,
  guests: 2,
  contact,
  travelers: [
    { fullName: "Nguyễn Minh Anh", dateOfBirth: "1995-04-12" },
    { fullName: "Trần Văn Bình", dateOfBirth: "" },
  ],
  note: "",
};

const created = { data: { code: "GT7K4Q2M" }, status: 201 };
const bearer = { headers: { Authorization: "Bearer token-123" }, cache: "no-store" };

beforeEach(() => {
  vi.clearAllMocks();
  getSessionToken.mockResolvedValue("token-123");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("createBookingAction", () => {
  it("gửi đơn cho API bằng Bearer token, KHÔNG gửi giá; thành công thì làm mới cache số chỗ", async () => {
    api.createTourBooking.mockResolvedValue(created);

    const result = await createBookingAction({ ...tourForm, unitPrice: 1, totalAmount: 1 });

    expect(result).toEqual({ ok: true, code: "GT7K4Q2M", redirectTo: "/bookings/GT7K4Q2M" });
    expect(api.createTourBooking).toHaveBeenCalledWith(
      {
        departureId: 8,
        guests: 2,
        contact,
        travelers: [
          { fullName: "Nguyễn Minh Anh", dateOfBirth: "1995-04-12" },
          { fullName: "Trần Văn Bình", dateOfBirth: null },
        ],
        note: null,
      },
      bearer,
    );
    expect(revalidateTag.mock.calls).toEqual([
      ["tours", { expire: 0 }],
      ["departures", { expire: 0 }],
    ]);
  });

  it("hết chỗ (409) → lỗi gắn vào số khách để wizard hiện ở đầu form; không làm mới cache", async () => {
    api.createTourBooking.mockRejectedValue(
      new ApiError({
        status: 409,
        title: "Không thực hiện được",
        errors: [{ field: "guests", message: "Chuyến này đã hết chỗ. Bạn vui lòng chọn ngày khác." }],
      }),
    );

    await expect(createBookingAction(tourForm)).resolves.toEqual({
      ok: false,
      fieldErrors: { guests: "Chuyến này đã hết chỗ. Bạn vui lòng chọn ngày khác." },
    });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("lỗi 400 theo ô của danh sách người đi được đổi sang đường dẫn của form", async () => {
    api.createTourBooking.mockRejectedValue(
      new ApiError({
        status: 400,
        title: "Dữ liệu không hợp lệ",
        errors: [{ field: "travelers[1].dateOfBirth", message: "Ngày sinh không được sau hôm nay." }],
      }),
    );

    await expect(createBookingAction(tourForm)).resolves.toEqual({
      ok: false,
      fieldErrors: { "travelers.1.dateOfBirth": "Ngày sinh không được sau hôm nay." },
    });
  });

  it("field lạ → dùng câu của API làm lỗi chung", async () => {
    api.createTourBooking.mockRejectedValue(
      new ApiError({ status: 400, title: "Lỗi", detail: "Có lỗi.", errors: [{ field: "la", message: "x" }] }),
    );

    await expect(createBookingAction(tourForm)).resolves.toEqual({ ok: false, message: "Có lỗi." });
  });

  it.each([
    ["token hết hạn (API trả 401)", "token-123"],
    ["không có phiên", undefined],
  ])("%s → đăng nhập lại rồi quay về trang đang đặt", async (_name, token) => {
    getSessionToken.mockResolvedValue(token);
    api.createTourBooking.mockRejectedValue(new ApiError({ status: 401, title: "Unauthorized" }));

    await expect(createBookingAction(tourForm)).rejects.toThrow(
      `REDIRECT /login?next=${encodeURIComponent("/tours/phu-quoc-4n3d/book?departure=8&guests=2")}`,
    );
    expect(api.createTourBooking).toHaveBeenCalledTimes(token ? 1 : 0);
  });

  it.each([
    ["lỗi mạng", new TypeError("fetch failed")],
    ["5xx", new ApiError({ status: 503, title: "Service Unavailable" })],
  ])("%s → báo hệ thống bận, log không chứa email", async (_name, error) => {
    api.createTourBooking.mockRejectedValue(error);

    await expect(createBookingAction(tourForm)).resolves.toEqual({ ok: false, message: SERVICE_UNAVAILABLE_MESSAGE });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(contact.email);
  });

  it("dữ liệu sai bị chặn ở server, không gọi API", async () => {
    const result = await createBookingAction({ ...tourForm, guests: 3 });

    expect(result).toMatchObject({ ok: false, fieldErrors: { travelers: "Số người đi phải bằng số khách đã chọn." } });
    expect(api.createTourBooking).not.toHaveBeenCalled();
  });
});

describe("createHotelBookingAction", () => {
  const hotelForm = {
    hotelSlug: "villa-thong-xanh-da-lat",
    roomTypeId: 3,
    checkIn: DEPART,
    checkOut: addDaysToIsoDate(DEPART, 2),
    guests: 2,
    rooms: 1,
    contact,
    guestName: "Minh Anh",
    note: "Nhận phòng muộn",
  };
  const hotel = { data: { roomTypes: [{ id: 3, maxGuests: 2 }] }, status: 200 };

  it("kiểm theo loại phòng của API rồi gửi đơn, làm mới cache khách sạn", async () => {
    api.getHotel.mockResolvedValue(hotel);
    api.createHotelBooking.mockResolvedValue(created);

    await expect(createHotelBookingAction(hotelForm)).resolves.toMatchObject({ ok: true, code: "GT7K4Q2M" });
    const [body] = api.createHotelBooking.mock.calls[0];
    expect(body).toEqual({
      roomTypeId: 3,
      checkIn: DEPART,
      checkOut: addDaysToIsoDate(DEPART, 2),
      guests: 2,
      rooms: 1,
      contact,
      guestName: "Minh Anh",
      note: "Nhận phòng muộn",
    });
    expect(revalidateTag.mock.calls).toEqual([["hotels", { expire: 0 }]]);
  });

  it("nhận phòng hôm nay bị chặn trước khi gọi API tạo đơn", async () => {
    api.getHotel.mockResolvedValue(hotel);

    await expect(createHotelBookingAction({ ...hotelForm, checkIn: today })).resolves.toMatchObject({
      ok: false,
      fieldErrors: { checkIn: "Đặt phòng trực tuyến chỉ nhận phòng từ ngày mai. Bạn vui lòng chọn ngày khác." },
    });
    expect(api.createHotelBooking).not.toHaveBeenCalled();
  });

  it("khách sạn không có hoặc bị ẩn → không nhận đặt; API lỗi → hệ thống bận", async () => {
    api.getHotel.mockRejectedValueOnce(new ApiError({ status: 404, title: "Không tìm thấy" }));
    await expect(createHotelBookingAction(hotelForm)).resolves.toEqual({
      ok: false,
      message: "Khách sạn này hiện không nhận đặt phòng.",
    });

    api.getHotel.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(createHotelBookingAction(hotelForm)).resolves.toEqual({
      ok: false,
      message: SERVICE_UNAVAILABLE_MESSAGE,
    });
    expect(api.createHotelBooking).not.toHaveBeenCalled();
  });
});

describe("vé máy bay", () => {
  const search = {
    tripType: "roundTrip" as const,
    from: "SGN",
    to: "HAN",
    departDate: DEPART,
    returnDate: RETURN,
    adults: 1,
    children: 0,
    infants: 1,
    cabin: "premiumEconomy" as const,
  };
  const flightForm = {
    search,
    outboundId: 2,
    returnId: 7,
    contact,
    passengers: [
      { type: "adult" as const, fullName: "Minh Anh", dateOfBirth: "" },
      { type: "infant" as const, fullName: "Bảo An", dateOfBirth: addDaysToIsoDate(DEPART, -400) },
    ],
    note: "",
  };

  it("đổi hạng ghế và loại hành khách sang enum của API; khứ hồi gửi đủ chiều về", async () => {
    api.createFlightBooking.mockResolvedValue(created);

    await expect(createFlightBookingAction(flightForm)).resolves.toMatchObject({ ok: true });
    expect(api.createFlightBooking.mock.calls[0][0]).toEqual({
      outboundScheduleId: 2,
      returnScheduleId: 7,
      from: "SGN",
      to: "HAN",
      departDate: DEPART,
      returnDate: RETURN,
      cabin: "PREMIUM_ECONOMY",
      contact,
      passengers: [
        { type: "ADULT", fullName: "Minh Anh", dateOfBirth: null },
        { type: "INFANT", fullName: "Bảo An", dateOfBirth: addDaysToIsoDate(DEPART, -400) },
      ],
      note: null,
    });
    expect(revalidateTag.mock.calls).toEqual([["flights", { expire: 0 }]]);
  });

  it("một chiều không gửi chiều về", async () => {
    api.createFlightBooking.mockResolvedValue(created);

    await createFlightBookingAction({ ...flightForm, search: { ...search, tripType: "oneWay", returnDate: "" }, returnId: 0 });

    expect(api.createFlightBooking.mock.calls[0][0]).toMatchObject({ returnScheduleId: null, returnDate: null });
  });

  const option = (patch: Partial<FlightOptionResponse>): FlightOptionResponse => ({
    scheduleId: 2,
    airline: { code: "MT", name: "Mây Trời Airlines" },
    flightNumber: "MT113",
    from: { code: "SGN", name: "A", city: "TP. Hồ Chí Minh" },
    to: { code: "HAN", name: "B", city: "Hà Nội" },
    date: DEPART,
    departTime: "08:30",
    arriveTime: "10:35",
    arrivesNextDay: false,
    durationMinutes: 125,
    cabin: "PREMIUM_ECONOMY",
    fares: { adult: 2_384_000, child: 1_788_000, infant: 238_000 },
    seatsLeft: 10,
    isBookable: true,
    ...patch,
  });

  it("nút 'Chọn' hỏi API không cache cho đủ số hành khách; chuyến không đặt được thì báo, không chuyển trang", async () => {
    api.getFlight.mockResolvedValueOnce({ data: option({}), status: 200 });
    api.getFlight.mockResolvedValueOnce({ data: option({ flightNumber: "MT114", isBookable: false }), status: 200 });

    await expect(startFlightBookingAction({ search, outboundId: 2, returnId: 5 })).resolves.toEqual({
      ok: false,
      message: "Chuyến MT114 không còn đủ ghế ở hạng đã chọn. Bạn vui lòng chọn chuyến khác.",
    });
    expect(api.getFlight.mock.calls[1]).toEqual([
      5,
      { from: "HAN", to: "SGN", date: RETURN, cabin: "PREMIUM_ECONOMY", adults: 1, children: 0, infants: 1 },
      expect.objectContaining({ cache: "no-store" }),
    ]);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("chuyến đặt được → sang trang đặt vé khi đã đăng nhập", async () => {
    api.getFlight.mockResolvedValue({ data: option({}), status: 200 });
    getCurrentUser.mockResolvedValue({ name: "Minh Anh", email: "a@example.com" });

    await expect(startFlightBookingAction({ search, outboundId: 2, returnId: 7 })).rejects.toThrow(
      /^REDIRECT \/flights\/book\?.*&out=2&ret=7$/,
    );
  });

  it("chuyến không còn (404) → báo không còn khai thác", async () => {
    api.getFlight.mockRejectedValue(new ApiError({ status: 404, title: "Không tìm thấy" }));

    await expect(startFlightBookingAction({ search, outboundId: 2, returnId: 7 })).resolves.toMatchObject({
      ok: false,
      message: "Chuyến bay đã chọn không còn khai thác. Bạn vui lòng chọn chuyến khác.",
    });
  });
});
