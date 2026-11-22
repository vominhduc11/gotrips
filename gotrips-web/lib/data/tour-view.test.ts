import { describe, expect, it } from "vitest";
import type { Destination, Tour, TourDeparture } from "@/lib/types";
import { ALMOST_FULL_THRESHOLD, getTodayInVietnam, toTourCardView } from "./tour-view";

const TODAY = "2027-01-01";

const destination: Destination = {
  id: 1,
  slug: "da-lat",
  name: "Đà Lạt",
  region: "Tây Nguyên",
  imageUrl: "https://images.unsplash.com/photo-test",
  imageAlt: "Đà Lạt",
};

const tour: Tour = {
  id: 10,
  slug: "da-lat-3n2d",
  title: "Đà Lạt 3N2Đ",
  destinationId: 1,
  durationDays: 3,
  durationNights: 2,
  departureCity: "TP. Hồ Chí Minh",
  shortDescription: "Tour thử",
  coverImage: "https://images.unsplash.com/photo-test",
  coverImageAlt: "Ảnh tour",
  rating: 4.8,
  reviewCount: 120,
  isFeatured: true,
  status: "ACTIVE",
};

function departure(overrides: Partial<TourDeparture>): TourDeparture {
  return {
    id: 1,
    tourId: 10,
    departureDate: "2027-02-01",
    price: 3_000_000,
    totalSeats: 20,
    bookedSeats: 0,
    ...overrides,
  };
}

describe("toTourCardView", () => {
  it("tour hết chỗ (mọi chuyến full hoặc đã qua) → không có giá, ngày, số chỗ", () => {
    const view = toTourCardView(
      tour,
      destination,
      [
        departure({ id: 1, departureDate: "2027-02-01", totalSeats: 10, bookedSeats: 10 }),
        departure({ id: 2, departureDate: "2026-12-01" }), // đã qua
      ],
      TODAY,
    );

    expect(view.priceFrom).toBeNull();
    expect(view.nextDepartureDate).toBeNull();
    expect(view.seatsLeft).toBeNull();
    expect(view.discountPercent).toBeNull();
    expect(view.isAlmostFull).toBe(false);
  });

  it("tour giảm giá → lấy chuyến rẻ nhất, tính % giảm làm tròn từ giá gốc của chính chuyến đó", () => {
    const view = toTourCardView(
      tour,
      destination,
      [
        departure({ id: 1, departureDate: "2027-02-01", price: 4_000_000 }),
        departure({ id: 2, departureDate: "2027-03-01", price: 3_000_000, originalPrice: 4_000_000 }),
      ],
      TODAY,
    );

    expect(view.priceFrom).toBe(3_000_000);
    expect(view.originalPriceFrom).toBe(4_000_000);
    expect(view.discountPercent).toBe(25);
    // Ngày gần nhất là chuyến sớm nhất, không phải chuyến rẻ nhất.
    expect(view.nextDepartureDate).toBe("2027-02-01");
  });

  it("giá gốc không cao hơn giá bán thì không coi là giảm giá", () => {
    const view = toTourCardView(
      tour,
      destination,
      [departure({ price: 3_000_000, originalPrice: 3_000_000 })],
      TODAY,
    );

    expect(view.originalPriceFrom).toBeNull();
    expect(view.discountPercent).toBeNull();
  });

  it("chuyến gần nhất sắp hết chỗ (≤ ngưỡng) → isAlmostFull", () => {
    const view = toTourCardView(
      tour,
      destination,
      [departure({ totalSeats: 20, bookedSeats: 20 - ALMOST_FULL_THRESHOLD })],
      TODAY,
    );

    expect(view.seatsLeft).toBe(ALMOST_FULL_THRESHOLD);
    expect(view.isAlmostFull).toBe(true);
  });

  it("còn nhiều chỗ (> ngưỡng) → không phải sắp hết chỗ", () => {
    const view = toTourCardView(
      tour,
      destination,
      [departure({ totalSeats: 20, bookedSeats: 20 - ALMOST_FULL_THRESHOLD - 1 })],
      TODAY,
    );

    expect(view.isAlmostFull).toBe(false);
  });
});

describe("getTodayInVietnam", () => {
  it("tính theo giờ Việt Nam (UTC+7), không theo UTC", () => {
    // 20:00 UTC ngày 31/12 đã là 03:00 ngày 01/01 ở Việt Nam.
    expect(getTodayInVietnam(new Date("2026-12-31T20:00:00Z"))).toBe("2027-01-01");
  });
});
