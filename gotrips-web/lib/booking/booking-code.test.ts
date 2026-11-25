import { describe, expect, it } from "vitest";
import { BOOKING_CODE_ALPHABET, generateBookingCode, isBookingCode } from "./booking-code";

describe("generateBookingCode", () => {
  it("có dạng GT + 6 ký tự, khớp isBookingCode", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateBookingCode();
      expect(code).toMatch(/^GT[A-Z0-9]{6}$/);
      expect(isBookingCode(code)).toBe(true);
    }
  });

  it("không dùng ký tự dễ đọc nhầm 0, O, 1, I, L", () => {
    expect(BOOKING_CODE_ALPHABET).not.toMatch(/[01OIL]/);
    const allBytes = Uint8Array.from({ length: 6 }, (_, i) => i * 51);
    expect(generateBookingCode(allBytes).slice(2)).not.toMatch(/[01OIL]/);
  });

  it("cùng byte ngẫu nhiên thì cùng mã (nguồn ngẫu nhiên truyền vào được để test)", () => {
    const bytes = Uint8Array.from([0, 1, 2, 30, 31, 255]);
    expect(generateBookingCode(bytes)).toBe(generateBookingCode(bytes));
    // byte % 31: 0→"2", 1→"3", 2→"4", 30→"Z", 31→"2", 255 (=8·31+7)→"9"
    expect(generateBookingCode(bytes)).toBe("GT234Z29");
  });
});

describe("isBookingCode", () => {
  it.each(["GT7K4Q2M", "GTZZZZZZ"])("nhận %s", (code) => expect(isBookingCode(code)).toBe(true));

  it.each(["", "gt7k4q2m", "GT7K4Q2", "GT7K4Q2MX", "GT7K4Q0M", "XX7K4Q2M", "GT-7K4Q2"])("từ chối '%s'", (code) => {
    expect(isBookingCode(code)).toBe(false);
  });
});
