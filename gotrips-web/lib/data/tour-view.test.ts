import { describe, expect, it } from "vitest";
import { getSeatsLeft, getTodayInVietnam } from "./tour-view";

describe("getTodayInVietnam", () => {
  it("tính theo giờ Việt Nam (UTC+7), không theo UTC", () => {
    // 20:00 UTC ngày 31/12 đã là 03:00 ngày 01/01 ở Việt Nam.
    expect(getTodayInVietnam(new Date("2026-12-31T20:00:00Z"))).toBe("2027-01-01");
  });
});

describe("getSeatsLeft", () => {
  it("bằng tổng chỗ trừ chỗ đã đặt", () => {
    expect(getSeatsLeft({ totalSeats: 20, bookedSeats: 6 })).toBe(14);
  });

  it("không bao giờ âm, kể cả dữ liệu đã đặt vượt tổng chỗ", () => {
    expect(getSeatsLeft({ totalSeats: 20, bookedSeats: 25 })).toBe(0);
  });
});
