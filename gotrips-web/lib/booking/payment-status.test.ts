import { afterEach, describe, expect, it, vi } from "vitest";
import {
  bookingPaymentStatusQuery,
  hasPaymentChanged,
  nextPollDelay,
  PAYMENT_POLL_INTERVAL_MS,
  PAYMENT_POLL_LIMIT,
  PaymentStatusError,
  paymentStatusPath,
  type PaymentSnapshot,
} from "./payment-status";

const waiting: PaymentSnapshot = { status: "PENDING", paymentStatus: "UNPAID", receivedAmount: 0 };

afterEach(() => vi.unstubAllGlobals());

describe("hasPaymentChanged", () => {
  it("không đổi khi cả ba trường như cũ", () => {
    expect(hasPaymentChanged(waiting, { ...waiting })).toBe(false);
  });

  it.each<[string, Partial<PaymentSnapshot>]>([
    ["nhận thêm một phần tiền", { receivedAmount: 1_000_000 }],
    ["đủ tiền", { paymentStatus: "PAID" }],
    ["được xác nhận", { status: "CONFIRMED", paymentStatus: "PAID" }],
    ["bị huỷ", { status: "CANCELLED", paymentStatus: "CANCELLED" }],
  ])("đổi khi %s", (_, patch) => {
    expect(hasPaymentChanged(waiting, { ...waiting, ...patch })).toBe(true);
  });
});

describe("nextPollDelay", () => {
  it("hỏi tiếp đều đặn, kể cả sau lỗi mạng hoặc 5xx", () => {
    expect(nextPollDelay(0, null)).toBe(PAYMENT_POLL_INTERVAL_MS);
    expect(nextPollDelay(3, new PaymentStatusError(503))).toBe(PAYMENT_POLL_INTERVAL_MS);
    expect(nextPollDelay(3, new TypeError("Failed to fetch"))).toBe(PAYMENT_POLL_INTERVAL_MS);
  });

  it("ngừng khi hết phiên, đơn không còn, hoặc đã hỏi đủ số lần", () => {
    expect(nextPollDelay(1, new PaymentStatusError(401))).toBe(false);
    expect(nextPollDelay(1, new PaymentStatusError(404))).toBe(false);
    expect(nextPollDelay(PAYMENT_POLL_LIMIT - 1, null)).toBe(PAYMENT_POLL_INTERVAL_MS);
    expect(nextPollDelay(PAYMENT_POLL_LIMIT, null)).toBe(false);
  });
});

describe("bookingPaymentStatusQuery", () => {
  const context = { signal: new AbortController().signal } as Parameters<
    NonNullable<ReturnType<typeof bookingPaymentStatusQuery>["queryFn"]>
  >[0];

  it("gọi Route Handler cùng origin, không cache", async () => {
    const body = { code: "GT7K4Q2M", status: "PENDING", paymentStatus: "UNPAID", totalAmount: 10, receivedAmount: 4 };
    const fetchMock = vi.fn().mockResolvedValue(Response.json(body));
    vi.stubGlobal("fetch", fetchMock);

    await expect(bookingPaymentStatusQuery("GT7K4Q2M").queryFn!(context)).resolves.toEqual(body);
    expect(fetchMock).toHaveBeenCalledWith("/api/bookings/GT7K4Q2M/payment-status",
      expect.objectContaining({ cache: "no-store" }));
  });

  it("lỗi HTTP giữ mã để biết khi nào ngừng hỏi", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));

    await expect(bookingPaymentStatusQuery("GT7K4Q2M").queryFn!(context)).rejects.toMatchObject({ status: 401 });
  });

  it("mã đơn được mã hoá khi ghép vào đường dẫn", () => {
    expect(paymentStatusPath("../x")).toBe("/api/bookings/..%2Fx/payment-status");
  });
});
