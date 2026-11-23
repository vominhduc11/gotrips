import { describe, expect, it } from "vitest";
import { parseTourFilters } from "@/lib/schemas/tour-filters";
import type { Destination, Tour, TourDeparture } from "@/lib/types";
import { searchTourList } from "./tour-search";

const TODAY = "2027-01-01";

const destinations: Destination[] = [
  { id: 1, slug: "da-lat", name: "Đà Lạt", region: "Tây Nguyên", imageUrl: "x", imageAlt: "x" },
  { id: 2, slug: "sapa", name: "Sapa", region: "Tây Bắc", imageUrl: "x", imageAlt: "x" },
];

function tour(id: number, overrides: Partial<Tour> = {}): Tour {
  return {
    id,
    slug: `tour-${id}`,
    title: `Tour ${id}`,
    destinationId: 1,
    durationDays: 3,
    durationNights: 2,
    departureCity: "TP. Hồ Chí Minh",
    shortDescription: "",
    coverImage: "x",
    coverImageAlt: "x",
    rating: 4.5,
    reviewCount: 10,
    isFeatured: false,
    status: "ACTIVE",
    ...overrides,
  };
}

function departure(id: number, tourId: number, overrides: Partial<TourDeparture> = {}): TourDeparture {
  return {
    id,
    tourId,
    departureDate: "2027-02-01",
    price: 1_000_000,
    totalSeats: 20,
    bookedSeats: 0,
    ...overrides,
  };
}

const tours = [
  tour(1, { title: "Đà Lạt 3N2Đ", isFeatured: true, rating: 4.2 }),
  tour(2, { title: "Đà Lạt săn mây", rating: 4.9 }),
  tour(3, { title: "Sapa ruộng bậc thang", destinationId: 2, rating: 4.6 }),
  tour(4, { title: "Tour đã ẩn", status: "HIDDEN" }),
  tour(5, { title: "Tour hết chỗ" }),
];

const departures = [
  departure(1, 1, { price: 3_000_000, departureDate: "2027-03-01" }),
  departure(2, 2, { price: 1_500_000, departureDate: "2027-02-01", totalSeats: 4, bookedSeats: 2 }),
  departure(3, 3, { price: 2_000_000, departureDate: "2027-02-15" }),
  departure(4, 4),
  // Tour 5: chỉ có chuyến đã qua và chuyến đã đầy → không đặt được.
  departure(5, 5, { departureDate: "2026-12-01" }),
  departure(6, 5, { totalSeats: 10, bookedSeats: 10 }),
];

function search(raw: Record<string, string>, pageSize?: number) {
  return searchTourList({ tours, destinations, departures, filters: parseTourFilters(raw), today: TODAY, pageSize });
}

const ids = (result: ReturnType<typeof search>) => result.items.map((t) => t.id);

describe("searchTourList", () => {
  it("không lọc: bỏ tour HIDDEN, tour hết chỗ vẫn hiện và xếp cuối", () => {
    const result = search({});
    expect(ids(result)).toEqual([1, 2, 3, 5]);
    expect(result.total).toBe(4);
    expect(result.items.at(-1)?.priceFrom).toBeNull();
  });

  it("lọc theo điểm đến (slug)", () => {
    const result = search({ destination: "sapa" });
    expect(ids(result)).toEqual([3]);
    expect(result.destination?.name).toBe("Sapa");
  });

  it("slug không tồn tại → rỗng, không bỏ qua bộ lọc", () => {
    const result = search({ destination: "khong-co" });
    expect(result.items).toEqual([]);
    expect(result.destination).toBeNull();
  });

  it("lọc theo từ khoá không phân biệt hoa/thường/dấu, khớp cả tên điểm đến", () => {
    expect(ids(search({ q: "san may" }))).toEqual([2]);
    expect(ids(search({ q: "SAPA" }))).toEqual([3]);
  });

  it("lọc theo ngày: chỉ tour có chuyến đúng ngày đó, giá/ngày hiển thị của chuyến đó", () => {
    const result = search({ date: "2027-03-01" });
    expect(ids(result)).toEqual([1]);
    expect(result.items[0]).toMatchObject({ nextDepartureDate: "2027-03-01", priceFrom: 3_000_000 });
  });

  it("lọc theo số khách: loại chuyến không đủ chỗ", () => {
    expect(ids(search({ guests: "3" }))).toEqual([1, 3]); // tour 2 chỉ còn 2 chỗ
    expect(ids(search({ guests: "2" }))).toEqual([1, 2, 3]);
  });

  it("lọc ngày/khách loại luôn tour hết chỗ", () => {
    expect(ids(search({ guests: "1" }))).not.toContain(5);
  });

  it("sắp xếp theo giá", () => {
    expect(ids(search({ sort: "gia-tang" }))).toEqual([2, 3, 1, 5]);
    expect(ids(search({ sort: "gia-giam" }))).toEqual([1, 3, 2, 5]);
  });

  it("sắp xếp theo ngày gần nhất và đánh giá", () => {
    expect(ids(search({ sort: "ngay-gan" }))).toEqual([2, 3, 1, 5]);
    expect(ids(search({ sort: "danh-gia" }))).toEqual([2, 3, 1, 5]);
  });

  it("phân trang và kẹp trang vượt quá vào trang cuối", () => {
    const first = search({}, 3);
    expect(first).toMatchObject({ page: 1, pageCount: 2, total: 4 });
    expect(ids(first)).toEqual([1, 2, 3]);

    const beyond = search({ page: "99" }, 3);
    expect(beyond.page).toBe(2);
    expect(ids(beyond)).toEqual([5]);
  });

  it("không có kết quả vẫn có 1 trang", () => {
    expect(search({ q: "khong khop gi ca" })).toMatchObject({ total: 0, page: 1, pageCount: 1 });
  });
});
