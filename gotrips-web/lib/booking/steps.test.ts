import { describe, expect, it } from "vitest";
import {
  changeTripDeparture,
  getMaxGuests,
  normalizeBookingSelection,
  resolveBookingStep,
  resolveTripSelection,
} from "./steps";

describe("resolveBookingStep", () => {
  it("thông tin hợp lệ thì hiện đúng bước được yêu cầu", () => {
    expect(resolveBookingStep("thong-tin", { isDetailsValid: true })).toBe("thong-tin");
    expect(resolveBookingStep("xac-nhan", { isDetailsValid: true })).toBe("xac-nhan");
  });

  it("đòi Xác nhận khi thông tin chưa hợp lệ (vd vừa tải lại trang) → về Thông tin", () => {
    expect(resolveBookingStep("xac-nhan", { isDetailsValid: false })).toBe("thong-tin");
    expect(resolveBookingStep("thong-tin", { isDetailsValid: false })).toBe("thong-tin");
  });
});

// Sắp theo ngày tăng dần như `TourDetailView.departures`: chuyến sớm nhất đã hết chỗ.
const departures = [
  { id: 1, seatsLeft: 0, isSoldOut: true },
  { id: 8, seatsLeft: 10, isSoldOut: false },
  { id: 9, seatsLeft: 4, isSoldOut: false },
];

describe("normalizeBookingSelection", () => {
  it("chuyến trên URL còn đặt được thì được chọn, số khách giữ nguyên", () => {
    expect(normalizeBookingSelection({ departure: 8, guests: 3 }, departures)).toEqual({ departureId: 8, guests: 3 });
  });

  it("số khách vượt số chỗ còn thì hạ xuống", () => {
    expect(normalizeBookingSelection({ departure: 9, guests: 7 }, departures)).toEqual({ departureId: 9, guests: 4 });
  });

  it("chuyến không có, hết chỗ hoặc không ghi trên URL → chưa chọn (0)", () => {
    expect(normalizeBookingSelection({ departure: 99, guests: 2 }, departures).departureId).toBe(0);
    expect(normalizeBookingSelection({ departure: 1, guests: 2 }, departures).departureId).toBe(0);
    expect(normalizeBookingSelection({ departure: undefined, guests: 2 }, departures)).toEqual({
      departureId: 0,
      guests: 2,
    });
  });
});

describe("resolveTripSelection", () => {
  it("URL ghi chuyến còn đặt được thì theo URL", () => {
    expect(resolveTripSelection({ departure: 9, guests: 2 }, departures)).toEqual({ departureId: 9, guests: 2 });
  });

  it("URL không ghi chuyến, chuyến lạ hoặc hết chỗ → chuyến gần nhất còn chỗ, số khách theo chỗ còn", () => {
    expect(resolveTripSelection({ departure: undefined, guests: 1 }, departures)).toEqual({ departureId: 8, guests: 1 });
    expect(resolveTripSelection({ departure: 1, guests: 3 }, departures)).toEqual({ departureId: 8, guests: 3 });
    expect(resolveTripSelection({ departure: 99, guests: 10 }, [departures[2]])).toEqual({ departureId: 9, guests: 4 });
  });

  it("tour hết chỗ mọi ngày → chưa chọn (0)", () => {
    expect(resolveTripSelection({ departure: undefined, guests: 1 }, [departures[0]]).departureId).toBe(0);
  });
});

describe("changeTripDeparture", () => {
  it("đổi chuyến, giữ số khách nếu chuyến mới đủ chỗ", () => {
    expect(changeTripDeparture({ departureId: 9, guests: 3 }, 8, departures)).toEqual({ departureId: 8, guests: 3 });
  });

  it("chuyến mới ít chỗ hơn số khách thì hạ số khách", () => {
    expect(changeTripDeparture({ departureId: 8, guests: 7 }, 9, departures)).toEqual({ departureId: 9, guests: 4 });
  });

  it("chuyến hết chỗ hoặc không có thì giữ nguyên lựa chọn cũ", () => {
    const current = { departureId: 8, guests: 2 };
    expect(changeTripDeparture(current, 1, departures)).toBe(current);
    expect(changeTripDeparture(current, 99, departures)).toBe(current);
  });
});

describe("getMaxGuests", () => {
  it("= min(số chỗ còn, giới hạn mỗi đơn), ít nhất 1", () => {
    expect(getMaxGuests({ seatsLeft: 4 })).toBe(4);
    expect(getMaxGuests({ seatsLeft: 50 })).toBe(10);
    expect(getMaxGuests(undefined)).toBe(10);
    expect(getMaxGuests({ seatsLeft: 0 })).toBe(1);
  });
});
