import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDuration,
  formatFlightDuration,
  formatRating,
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
