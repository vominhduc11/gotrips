import { describe, expect, it } from "vitest";
import { BOOKINGS_COOKIE_MAX_BYTES, decodeBookings, encodeBookings, fitBookingsToCookie } from "./cookie-codec";
import { makeBooking, makeFlightBooking, makeHotelBooking } from "./test-fixtures";

describe("encodeBookings / decodeBookings", () => {
  it("mã hoá rồi giải mã cho lại đúng dữ liệu, kể cả tiếng Việt có dấu", () => {
    const bookings = [makeBooking(), makeBooking({ code: "GTABCDEF", note: "Ăn chay, cần ghế trẻ em – cảm ơn!" })];
    const value = encodeBookings(bookings);
    expect(value).toMatch(/^[A-Za-z0-9_-]+$/); // base64url: không có ký tự phải mã hoá trong cookie
    expect(decodeBookings(value)).toEqual(bookings);
  });

  it.each([undefined, "", "khong-phai-base64!!", encodeBookings([]).slice(0, 1)])(
    "cookie trống hoặc hỏng (%s) → danh sách rỗng",
    (value) => {
      expect(decodeBookings(value)).toEqual([]);
    },
  );

  it("JSON hợp lệ nhưng sai cấu trúc (bị sửa tay) → danh sách rỗng", () => {
    const tampered = Buffer.from(JSON.stringify([{ code: "GT7K4Q2M", totalAmount: -1 }]), "utf8").toString("base64url");
    expect(decodeBookings(tampered)).toEqual([]);
    const wrongStatus = encodeBookings([{ ...makeBooking(), status: "PAID" as never }]);
    expect(decodeBookings(wrongStatus)).toEqual([]);
  });
});

describe("nhiều loại đơn trong cùng cookie", () => {
  it("đơn tour, khách sạn, vé máy bay mã hoá rồi giải mã cho lại đúng", () => {
    const bookings = [makeFlightBooking(), makeHotelBooking(), makeBooking()];
    expect(decodeBookings(encodeBookings(bookings))).toEqual(bookings);
  });

  it("đơn cũ (tạo trước khi có khách sạn/vé, không có `kind`) được đọc là đơn tour", () => {
    const legacy: Record<string, unknown> = { ...makeBooking() };
    delete legacy.kind;
    const value = Buffer.from(JSON.stringify([legacy]), "utf8").toString("base64url");
    expect(decodeBookings(value)).toEqual([makeBooking()]);
  });

  it("đơn sai cấu trúc theo loại của nó → danh sách rỗng", () => {
    const broken = encodeBookings([{ ...makeFlightBooking(), segments: [] }]);
    expect(decodeBookings(broken)).toEqual([]);
    const wrongKind = encodeBookings([{ ...makeHotelBooking(), kind: "tour" } as never]);
    expect(decodeBookings(wrongKind)).toEqual([]);
  });

  it("đơn vé 9 hành khách tên dài vẫn lưu được", () => {
    const passengers = Array.from({ length: 9 }, (_, i) => ({
      type: "adult" as const,
      fullName: `Nguyễn Thị Phương Thảo Ánh Dương ${i}`,
      dateOfBirth: "1990-01-01",
    }));
    expect(fitBookingsToCookie([makeFlightBooking({ passengers, note: "ư".repeat(500) })]).kept).toHaveLength(1);
  });
});

describe("fitBookingsToCookie", () => {
  it("vừa giới hạn thì giữ nguyên", () => {
    const bookings = [makeBooking()];
    expect(fitBookingsToCookie(bookings)).toEqual({ value: encodeBookings(bookings), kept: bookings });
  });

  it("vượt giới hạn thì bỏ đơn cũ nhất (cuối mảng) cho tới khi vừa", () => {
    const codes = ["GT222222", "GT333333", "GT444444", "GT555555", "GT666666", "GT777777", "GT888888", "GT999999"];
    const bookings = codes.map((code) => makeBooking({ code }));
    const { value, kept } = fitBookingsToCookie(bookings);

    expect(value.length).toBeLessThanOrEqual(BOOKINGS_COOKIE_MAX_BYTES);
    expect(kept.length).toBeGreaterThan(0);
    expect(kept.length).toBeLessThan(bookings.length);
    expect(kept.map((b) => b.code)).toEqual(codes.slice(0, kept.length)); // các đơn MỚI NHẤT được giữ
    expect(decodeBookings(value)).toEqual(kept);
  });

  it("đơn 10 khách tên dài vẫn lưu được ít nhất 1 đơn", () => {
    const travelers = Array.from({ length: 10 }, (_, i) => ({
      fullName: `Nguyễn Thị Phương Thảo Ánh Dương ${i}`,
      dateOfBirth: "1990-01-01",
    }));
    const { kept } = fitBookingsToCookie([makeBooking({ guestCount: 10, travelers, note: "ư".repeat(500) })]);
    expect(kept).toHaveLength(1);
  });
});
