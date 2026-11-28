import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const { getMyBookingPaymentStatus } = vi.hoisted(() => ({ getMyBookingPaymentStatus: vi.fn() }));
vi.mock("@/lib/data/bookings", () => ({ getMyBookingPaymentStatus }));

const status = { code: "GT7K4Q2M", status: "PENDING", paymentStatus: "UNPAID", totalAmount: 10, receivedAmount: 4 };

function call(code = "GT7K4Q2M") {
  return GET(new Request(`http://localhost/api/bookings/${code}/payment-status`), {
    params: Promise.resolve({ code }),
  });
}

afterEach(() => vi.clearAllMocks());

describe("GET /api/bookings/[code]/payment-status", () => {
  it("trả trạng thái của đơn, không cho cache", async () => {
    getMyBookingPaymentStatus.mockResolvedValue({ status: "ok", data: status });

    const response = await call();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual(status);
    expect(getMyBookingPaymentStatus).toHaveBeenCalledWith("GT7K4Q2M");
  });

  it("chưa đăng nhập hoặc hết phiên → 401", async () => {
    getMyBookingPaymentStatus.mockResolvedValue({ status: "unauthenticated" });
    expect((await call()).status).toBe(401);
  });

  it("không có đơn hoặc đơn của người khác → 404", async () => {
    getMyBookingPaymentStatus.mockResolvedValue({ status: "ok", data: null });
    expect((await call()).status).toBe(404);
  });

  it("API lỗi → 503, trang vẫn hỏi lại lần sau", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    getMyBookingPaymentStatus.mockRejectedValue(new Error("fetch failed"));

    const response = await call();
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
