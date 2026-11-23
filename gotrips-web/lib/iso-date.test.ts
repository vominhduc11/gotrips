import { describe, expect, it } from "vitest";
import { diffInDays, fromIsoDate, isIsoDate, toIsoDate } from "./iso-date";

describe("isIsoDate", () => {
  it("chấp nhận ngày hợp lệ, kể cả 29/2 năm nhuận", () => {
    expect(isIsoDate("2026-12-01")).toBe(true);
    expect(isIsoDate("2028-02-29")).toBe(true);
  });

  it("từ chối chuỗi trống, sai định dạng và ngày không có thật", () => {
    expect(isIsoDate("")).toBe(false);
    expect(isIsoDate("01/12/2026")).toBe(false);
    expect(isIsoDate("2026-12-1")).toBe(false);
    expect(isIsoDate("2027-02-29")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
  });
});

describe("diffInDays", () => {
  it("trả số ngày lịch, âm khi a trước b", () => {
    expect(diffInDays("2026-12-05", "2026-12-01")).toBe(4);
    expect(diffInDays("2026-12-01", "2026-12-01")).toBe(0);
    expect(diffInDays("2026-11-30", "2026-12-01")).toBe(-1);
  });

  it("đúng qua ranh giới tháng và năm", () => {
    expect(diffInDays("2027-01-02", "2026-12-30")).toBe(3);
  });
});

describe("toIsoDate / fromIsoDate", () => {
  it("đi và về giữ nguyên ngày (không lệch múi giờ)", () => {
    const date = fromIsoDate("2026-12-31");
    expect(date).toBeDefined();
    expect(toIsoDate(date as Date)).toBe("2026-12-31");
  });

  it("fromIsoDate trả undefined với giá trị trống/sai", () => {
    expect(fromIsoDate("")).toBeUndefined();
    expect(fromIsoDate("abc")).toBeUndefined();
  });
});
