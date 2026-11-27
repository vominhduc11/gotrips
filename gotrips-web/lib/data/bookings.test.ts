import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BookingSummaryResponse } from "@/lib/api/generated/model";

vi.mock("server-only", () => ({}));

const { getSessionToken, listMyBookingsApi, getMyBookingApi } = vi.hoisted(() => ({
  getSessionToken: vi.fn<() => Promise<string | undefined>>(),
  listMyBookingsApi: vi.fn(),
  getMyBookingApi: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ getSessionToken }));
vi.mock("@/lib/api/generated", () => ({ listMyBookings: listMyBookingsApi, getMyBooking: getMyBookingApi }));

import { ApiError } from "@/lib/api/http";
import { getMyBooking, getMyBookings } from "./bookings";

const summary: BookingSummaryResponse = {
  code: "GT7K4Q2M",
  kind: "HOTEL",
  status: "PENDING",
  paymentStatus: "UNPAID",
  totalAmount: 1_380_000,
  createdAt: "2026-11-23T03:00:00Z",
  hotel: {
    roomTypeId: 3,
    roomTypeName: "Phòng Standard",
    hotelSlug: "villa-thong-xanh-da-lat",
    hotelName: "Villa Thông Xanh",
    destinationName: "Đà Lạt",
    area: "Phường 9, Đà Lạt",
    imageUrl: "https://images.unsplash.com/photo-h",
    imageAlt: "Mặt tiền",
    checkInTime: "14:00",
    checkOutTime: "11:00",
    checkIn: "2027-06-10",
    checkOut: "2027-06-12",
    nights: 2,
    rooms: 1,
    guests: 2,
    pricePerNight: 690_000,
    guestName: "Minh Anh",
  },
};

beforeEach(() => {
  getSessionToken.mockReset();
  listMyBookingsApi.mockReset();
  getMyBookingApi.mockReset();
});

describe("getMyBookings", () => {
  it("chưa có phiên → cần đăng nhập, không gọi API", async () => {
    getSessionToken.mockResolvedValue(undefined);

    await expect(getMyBookings()).resolves.toEqual({ status: "unauthenticated" });
    expect(listMyBookingsApi).not.toHaveBeenCalled();
  });

  it("gọi API bằng Bearer token, không cache, và đổi sang View", async () => {
    getSessionToken.mockResolvedValue("token-123");
    listMyBookingsApi.mockResolvedValue({ data: [summary], status: 200 });

    const result = await getMyBookings();

    expect(listMyBookingsApi).toHaveBeenCalledWith({
      headers: { Authorization: "Bearer token-123" },
      cache: "no-store",
    });
    expect(result).toMatchObject({
      status: "ok",
      data: [{ code: "GT7K4Q2M", kindLabel: "Khách sạn", title: "Villa Thông Xanh" }],
    });
  });

  it("401 (token hết hạn) → cần đăng nhập lại", async () => {
    getSessionToken.mockResolvedValue("het-han");
    listMyBookingsApi.mockRejectedValue(new ApiError({ status: 401, title: "Unauthorized" }));

    await expect(getMyBookings()).resolves.toEqual({ status: "unauthenticated" });
  });

  it("API lỗi thì ném ra để trang hiện trạng thái lỗi cục bộ", async () => {
    getSessionToken.mockResolvedValue("t");
    listMyBookingsApi.mockRejectedValue(new TypeError("fetch failed"));

    await expect(getMyBookings()).rejects.toThrow("fetch failed");
  });
});

describe("getMyBooking", () => {
  it("mã sai định dạng → không có, KHÔNG gọi API (mã đi thẳng vào đường dẫn)", async () => {
    getSessionToken.mockResolvedValue("t");

    await expect(getMyBooking("../auth/me")).resolves.toEqual({ status: "ok", data: null });
    await expect(getMyBooking("me")).resolves.toEqual({ status: "ok", data: null });
    expect(getMyBookingApi).not.toHaveBeenCalled();
  });

  it("404 (không có hoặc đơn của người khác) → null", async () => {
    getSessionToken.mockResolvedValue("t");
    getMyBookingApi.mockRejectedValue(new ApiError({ status: 404, title: "Không tìm thấy" }));

    await expect(getMyBooking("GT222222")).resolves.toEqual({ status: "ok", data: null });
    expect(getMyBookingApi.mock.calls[0][0]).toBe("GT222222");
    expect(getMyBookingApi.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
  });

  it("5xx thì ném ra", async () => {
    getSessionToken.mockResolvedValue("t");
    getMyBookingApi.mockRejectedValue(new ApiError({ status: 500, title: "Internal Server Error" }));

    await expect(getMyBooking("GT222222")).rejects.toBeInstanceOf(ApiError);
  });
});
