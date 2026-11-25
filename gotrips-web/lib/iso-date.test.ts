import { describe, expect, it } from "vitest";
import { addDaysToIsoDate, ageInYears, diffInDays, fromIsoDate, isIsoDate, toIsoDate } from "./iso-date";

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

describe("ageInYears", () => {
  it("tuổi tròn: chưa tới sinh nhật thì chưa thêm tuổi", () => {
    expect(ageInYears("2015-01-10", "2027-01-09")).toBe(11);
    expect(ageInYears("2015-01-10", "2027-01-10")).toBe(12);
  });

  it("sinh 29/2 tính theo ngày lịch", () => {
    expect(ageInYears("2024-02-29", "2026-02-28")).toBe(1);
    expect(ageInYears("2024-02-29", "2026-03-01")).toBe(2);
  });
});

describe("addDaysToIsoDate", () => {
  it("cộng ngày qua tháng / năm", () => {
    expect(addDaysToIsoDate("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysToIsoDate("2027-03-01", -1)).toBe("2027-02-28");
  });
});
