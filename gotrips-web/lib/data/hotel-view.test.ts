import { describe, expect, it } from "vitest";
import type { Destination, Hotel, HotelRoomType } from "@/lib/types";
import { getMinPricePerNight, selectFeaturedHotels, toHotelCardView } from "./hotel-view";

const daLat: Destination = {
  id: 1,
  slug: "da-lat",
  name: "Đà Lạt",
  region: "Tây Nguyên",
  imageUrl: "https://images.unsplash.com/photo-a",
  imageAlt: "",
};
const phuQuoc: Destination = { ...daLat, id: 2, slug: "phu-quoc", name: "Phú Quốc", region: "Miền Nam" };
const destinations = [daLat, phuQuoc];

function makeHotel(overrides: Partial<Hotel> & Pick<Hotel, "id">): Hotel {
  return {
    slug: `khach-san-${overrides.id}`,
    name: `Khách sạn ${overrides.id}`,
    destinationId: 1,
    starRating: 4,
    area: "Khu vực",
    imageUrl: "https://images.unsplash.com/photo-a",
    imageAlt: "Ảnh",
    status: "ACTIVE",
    rating: 4.5,
    reviewCount: 100,
    ...overrides,
  };
}

function makeRoom(hotelId: number, pricePerNight: number, id = hotelId * 100 + pricePerNight): HotelRoomType {
  return { id, hotelId, name: `Phòng ${pricePerNight}`, pricePerNight, maxGuests: 2 };
}

describe("getMinPricePerNight", () => {
  it("lấy giá một đêm thấp nhất trong các loại phòng", () => {
    expect(getMinPricePerNight([makeRoom(1, 1_800_000), makeRoom(1, 900_000), makeRoom(1, 1_200_000)])).toBe(900_000);
  });

  it("không có loại phòng nào thì trả null", () => {
    expect(getMinPricePerNight([])).toBeNull();
  });
});

describe("toHotelCardView", () => {
  it("ghép tên/slug điểm đến và giá thấp nhất vào thẻ", () => {
    const view = toHotelCardView(makeHotel({ id: 1 }), daLat, [makeRoom(1, 1_500_000), makeRoom(1, 700_000)]);

    expect(view).toMatchObject({
      id: 1,
      destinationName: "Đà Lạt",
      destinationSlug: "da-lat",
      minPricePerNight: 700_000,
    });
  });

  it("khách sạn chưa có loại phòng thì không dựng được thẻ (null)", () => {
    expect(toHotelCardView(makeHotel({ id: 1 }), daLat, [])).toBeNull();
  });
});

describe("selectFeaturedHotels", () => {
  it("bỏ khách sạn HIDDEN dù có phòng và điểm cao", () => {
    const hotels = [makeHotel({ id: 1 }), makeHotel({ id: 2, status: "HIDDEN", rating: 5 })];
    const rooms = [makeRoom(1, 500_000), makeRoom(2, 500_000)];

    expect(selectFeaturedHotels(hotels, rooms, destinations, 10).map((h) => h.id)).toEqual([1]);
  });

  it("bỏ khách sạn không có loại phòng", () => {
    const hotels = [makeHotel({ id: 1 }), makeHotel({ id: 2 })];
    const rooms = [makeRoom(2, 500_000)];

    expect(selectFeaturedHotels(hotels, rooms, destinations, 10).map((h) => h.id)).toEqual([2]);
  });

  it("bỏ khách sạn trỏ tới điểm đến không tồn tại", () => {
    const hotels = [makeHotel({ id: 1, destinationId: 99 })];

    expect(selectFeaturedHotels(hotels, [makeRoom(1, 500_000)], destinations, 10)).toEqual([]);
  });

  it("tính giá thấp nhất riêng cho từng khách sạn", () => {
    const hotels = [makeHotel({ id: 1 }), makeHotel({ id: 2, destinationId: 2, rating: 4 })];
    const rooms = [makeRoom(1, 900_000), makeRoom(1, 700_000), makeRoom(2, 3_000_000)];

    const result = selectFeaturedHotels(hotels, rooms, destinations, 10);

    expect(result.map((h) => [h.id, h.minPricePerNight])).toEqual([
      [1, 700_000],
      [2, 3_000_000],
    ]);
  });

  it("sắp theo điểm giảm dần, rồi số đánh giá giảm dần, rồi id tăng dần", () => {
    const hotels = [
      makeHotel({ id: 1, rating: 4.5, reviewCount: 10 }),
      makeHotel({ id: 2, rating: 4.8, reviewCount: 5 }),
      makeHotel({ id: 3, rating: 4.5, reviewCount: 50 }),
      makeHotel({ id: 4, rating: 4.5, reviewCount: 50 }),
    ];
    const rooms = hotels.map((h) => makeRoom(h.id, 500_000));

    expect(selectFeaturedHotels(hotels, rooms, destinations, 10).map((h) => h.id)).toEqual([2, 3, 4, 1]);
  });

  it("cắt theo limit và limit âm coi như 0", () => {
    const hotels = [makeHotel({ id: 1 }), makeHotel({ id: 2 }), makeHotel({ id: 3 })];
    const rooms = hotels.map((h) => makeRoom(h.id, 500_000));

    expect(selectFeaturedHotels(hotels, rooms, destinations, 2)).toHaveLength(2);
    expect(selectFeaturedHotels(hotels, rooms, destinations, -1)).toEqual([]);
  });

  it("không làm thay đổi mảng đầu vào", () => {
    const hotels = [makeHotel({ id: 1, rating: 4 }), makeHotel({ id: 2, rating: 5 })];
    const rooms = hotels.map((h) => makeRoom(h.id, 500_000));
    const before = hotels.map((h) => h.id);

    selectFeaturedHotels(hotels, rooms, destinations, 10);

    expect(hotels.map((h) => h.id)).toEqual(before);
  });
});
