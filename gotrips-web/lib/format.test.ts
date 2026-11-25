import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatFlightDuration,
  formatRating,
  formatSeatsLeft,
  formatVND,
  normalizeSearchText,
} from "./format";

describe("formatVND", () => {
  it("dùng dấu chấm phân cách nghìn và ký hiệu ₫", () => {
    // Intl dùng khoảng trắng không ngắt (U+00A0) trước ₫, nên chuẩn hoá về khoảng trắng thường.
    expect(formatVND(3290000).replace(/\s/g, " ")).toBe("3.290.000 ₫");
  });
});

describe("formatDate", () => {
  it("đổi YYYY-MM-DD sang DD/MM/YYYY mà không phụ thuộc múi giờ", () => {
    expect(formatDate("2027-01-09")).toBe("09/01/2027");
  });

  it("bỏ phần giờ nếu truyền chuỗi ISO đầy đủ", () => {
    expect(formatDate("2027-01-09T23:30:00Z")).toBe("09/01/2027");
  });
});

describe("formatRating", () => {
  it("dùng dấu phẩy thập phân và luôn 1 chữ số", () => {
    expect(formatRating(4.8)).toBe("4,8");
    expect(formatRating(5)).toBe("5,0");
  });
});

describe("formatDuration", () => {
  it("ghép số ngày và đêm", () => {
    expect(formatDuration(3, 2)).toBe("3N2Đ");
  });
});

describe("formatFlightDuration", () => {
  it("ghi giờ và phút bằng chữ đầy đủ", () => {
    expect(formatFlightDuration(125)).toBe("2 giờ 5 phút");
    expect(formatFlightDuration(85)).toBe("1 giờ 25 phút");
  });

  it("bỏ phần không có: tròn giờ thì không ghi phút, dưới 1 giờ thì không ghi giờ", () => {
    expect(formatFlightDuration(60)).toBe("1 giờ");
    expect(formatFlightDuration(120)).toBe("2 giờ");
    expect(formatFlightDuration(55)).toBe("55 phút");
  });

  it("giá trị bất thường: số lẻ làm tròn, âm/NaN coi như 0", () => {
    expect(formatFlightDuration(59.6)).toBe("1 giờ");
    expect(formatFlightDuration(-5)).toBe("0 phút");
    expect(formatFlightDuration(Number.NaN)).toBe("0 phút");
  });
});

describe("normalizeSearchText", () => {
  it("bỏ dấu, hoa/thường, khoảng trắng và gạch nối", () => {
    expect(normalizeSearchText("Đà  Lạt")).toBe("da lat");
    expect(normalizeSearchText("da-lat")).toBe("da lat");
    expect(normalizeSearchText("  NHA TRANG ")).toBe("nha trang");
  });
});

describe("formatDateTime", () => {
  it("hiện theo giờ Việt Nam (UTC+7), không phụ thuộc múi giờ máy", () => {
    expect(formatDateTime("2026-11-23T03:05:00.000Z")).toBe("10:05 23/11/2026");
    // 17:30 UTC = 00:30 hôm sau ở Việt Nam
    expect(formatDateTime("2026-12-31T17:30:00Z")).toBe("00:30 01/01/2027");
  });
});

describe("formatSeatsLeft", () => {
  it("hết chỗ / sắp hết / còn nhiều", () => {
    expect(formatSeatsLeft({ seatsLeft: 0, isSoldOut: true, isAlmostFull: false })).toBe("Hết chỗ");
    expect(formatSeatsLeft({ seatsLeft: 4, isSoldOut: false, isAlmostFull: true })).toBe("Chỉ còn 4 chỗ");
    expect(formatSeatsLeft({ seatsLeft: 14, isSoldOut: false, isAlmostFull: false })).toBe("Còn 14 chỗ");
  });
});
