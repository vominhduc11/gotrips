import { describe, expect, it } from "vitest";
import type { BookingStatus, PaymentStatus } from "@/lib/types";
import { makeBooking, makeHotelBooking } from "./test-fixtures";
import { applyBookingAction, getAvailableActions, type BookingAction } from "./transitions";

const NOW = "2026-11-24T02:30:00.000Z";

function bookingIn(status: BookingStatus, paymentStatus: PaymentStatus) {
  const base = makeBooking();
  return makeBooking({ status, payment: { ...base.payment, status: paymentStatus } });
}

describe("getAvailableActions", () => {
  // Bảng đầy đủ trạng thái đơn × trạng thái thanh toán → thao tác được phép.
  it.each<[BookingStatus, PaymentStatus, BookingAction[]]>([
    ["PENDING", "UNPAID", ["mark-paid", "cancel"]],
    ["PENDING", "PAID", ["confirm", "cancel"]],
    ["CONFIRMED", "PAID", ["cancel"]],
    ["CONFIRMED", "UNPAID", ["cancel"]],
    ["CANCELLED", "CANCELLED", []],
    ["CANCELLED", "PAID", []],
  ])("%s + %s → %j", (status, paymentStatus, expected) => {
    expect(getAvailableActions({ status, paymentStatus })).toEqual(expected);
  });
});

describe("applyBookingAction", () => {
  it("mark-paid: thanh toán PAID kèm thời điểm, trạng thái đơn giữ nguyên", () => {
    const result = applyBookingAction(bookingIn("PENDING", "UNPAID"), "mark-paid", NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.booking.payment).toMatchObject({ status: "PAID", paidAt: NOW });
    expect(result.booking.status).toBe("PENDING");
  });

  it("confirm: chỉ khi đã thanh toán", () => {
    expect(applyBookingAction(bookingIn("PENDING", "UNPAID"), "confirm", NOW)).toEqual({
      ok: false,
      message: "Chỉ xác nhận được đơn đang chờ xác nhận và đã thanh toán.",
    });
    const result = applyBookingAction(bookingIn("PENDING", "PAID"), "confirm", NOW);
    expect(result.ok && result.booking).toMatchObject({ status: "CONFIRMED", confirmedAt: NOW });
  });

  it("cancel khi chưa thanh toán: khoản thanh toán cũng bị huỷ", () => {
    const result = applyBookingAction(bookingIn("PENDING", "UNPAID"), "cancel", NOW);
    expect(result.ok && result.booking).toMatchObject({
      status: "CANCELLED",
      cancelledAt: NOW,
      payment: { status: "CANCELLED" },
    });
  });

  it("cancel khi đã thanh toán: giữ PAID để nhân viên biết phải hoàn tiền", () => {
    const result = applyBookingAction(bookingIn("CONFIRMED", "PAID"), "cancel", NOW);
    expect(result.ok && result.booking).toMatchObject({ status: "CANCELLED", payment: { status: "PAID" } });
  });

  it("đơn đã huỷ không thao tác được nữa", () => {
    const cancelled = bookingIn("CANCELLED", "CANCELLED");
    for (const action of ["mark-paid", "confirm", "cancel"] as const) {
      expect(applyBookingAction(cancelled, action, NOW).ok).toBe(false);
    }
  });

  it("không sửa bản ghi gốc", () => {
    const original = bookingIn("PENDING", "UNPAID");
    const snapshot = structuredClone(original);
    applyBookingAction(original, "mark-paid", NOW);
    applyBookingAction(original, "cancel", NOW);
    expect(original).toEqual(snapshot);
  });
});

describe("cùng luật cho mọi loại đơn", () => {
  it("đơn khách sạn: đánh dấu đã thanh toán rồi xác nhận, giữ nguyên chi tiết phòng", () => {
    const paid = applyBookingAction(makeHotelBooking(), "mark-paid", NOW);
    expect(paid.ok).toBe(true);
    if (!paid.ok) return;
    const confirmed = applyBookingAction(paid.booking, "confirm", NOW);
    expect(confirmed.ok && confirmed.booking).toMatchObject({
      kind: "hotel",
      status: "CONFIRMED",
      roomTypeId: 1,
      payment: { status: "PAID" },
    });
  });
});
