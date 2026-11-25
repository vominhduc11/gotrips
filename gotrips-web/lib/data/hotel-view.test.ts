import { describe, expect, it } from "vitest";
import type { Destination, Hotel, HotelRoomType } from "@/lib/types";
import {
  computeStayTotal,
  countNights,
  findCheapestFittingRoom,
  findHotelDetail,
  getMinPricePerNight,
  listHotelSlugs,
  roomFitsGuests,
  searchHotels,
  selectFeaturedHotels,
  toHotelCardView,
} from "./hotel-view";

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
    description: "Giới thiệu",
    amenities: ["Hồ bơi"],
    checkInTime: "14:00",
    checkOutTime: "12:00",
    ...overrides,
  };
}

function makeRoom(
  hotelId: number,
  pricePerNight: number,
  id = hotelId * 100 + pricePerNight,
  maxGuests = 2,
): HotelRoomType {
  return { id, hotelId, name: `Phòng ${pricePerNight}`, pricePerNight, maxGuests, bedType: "1 giường đôi", areaM2: 25 };
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

describe("tiền phòng", () => {
  it("countNights = số ngày lịch giữa nhận và trả (qua tháng, qua năm)", () => {
    expect(countNights("2026-12-30", "2027-01-02")).toBe(3);
    expect(countNights("2027-02-28", "2027-03-01")).toBe(1);
  });

  it("computeStayTotal = giá một phòng một đêm × số đêm × số phòng", () => {
    expect(computeStayTotal(1_250_000, 3, 2)).toBe(7_500_000);
  });
});

describe("roomFitsGuests / findCheapestFittingRoom", () => {
  it("đủ chỗ khi khách ≤ sức chứa × số phòng, và mỗi phòng có ít nhất 1 khách", () => {
    expect(roomFitsGuests({ maxGuests: 2 }, 4, 2)).toBe(true);
    expect(roomFitsGuests({ maxGuests: 2 }, 5, 2)).toBe(false);
    expect(roomFitsGuests({ maxGuests: 4 }, 1, 2)).toBe(false);
    expect(roomFitsGuests({ maxGuests: 4 }, 1, 0)).toBe(false);
  });

  it("chọn phòng rẻ nhất trong các phòng đủ chỗ; không phòng nào đủ → undefined", () => {
    const rooms = [makeRoom(1, 900_000, 1, 2), makeRoom(1, 1_500_000, 2, 4), makeRoom(1, 1_200_000, 3, 3)];
    expect(findCheapestFittingRoom(rooms, 2, 1)?.id).toBe(1);
    expect(findCheapestFittingRoom(rooms, 3, 1)?.id).toBe(3);
    expect(findCheapestFittingRoom(rooms, 4, 1)?.id).toBe(2);
    expect(findCheapestFittingRoom(rooms, 5, 1)).toBeUndefined();
  });
});

describe("findHotelDetail / listHotelSlugs", () => {
  const hotels = [makeHotel({ id: 1 }), makeHotel({ id: 2, status: "HIDDEN" }), makeHotel({ id: 3 })];
  const rooms = [makeRoom(1, 1_500_000), makeRoom(1, 700_000), makeRoom(2, 500_000)];

  it("ghép chi tiết + loại phòng sắp theo giá tăng dần", () => {
    const detail = findHotelDetail(hotels, rooms, destinations, "khach-san-1");
    expect(detail?.roomTypes.map((r) => r.pricePerNight)).toEqual([700_000, 1_500_000]);
    expect(detail).toMatchObject({ description: "Giới thiệu", checkInTime: "14:00", minPricePerNight: 700_000 });
  });

  it("khách sạn HIDDEN, không có loại phòng hoặc slug lạ → null", () => {
    expect(findHotelDetail(hotels, rooms, destinations, "khach-san-2")).toBeNull();
    expect(findHotelDetail(hotels, rooms, destinations, "khach-san-3")).toBeNull();
    expect(findHotelDetail(hotels, rooms, destinations, "khong-co")).toBeNull();
  });

  it("chỉ liệt kê slug có trang chi tiết", () => {
    expect(listHotelSlugs(hotels, rooms, destinations)).toEqual(["khach-san-1"]);
  });
});

describe("searchHotels", () => {
  const hotels = [
    makeHotel({ id: 1, rating: 4.9 }),
    makeHotel({ id: 2, rating: 4.1 }),
    makeHotel({ id: 3, status: "HIDDEN" }),
    makeHotel({ id: 4, destinationId: 2 }),
  ];
  const rooms = [
    makeRoom(1, 2_000_000, 11, 2),
    makeRoom(2, 800_000, 21, 2),
    makeRoom(2, 1_100_000, 22, 4),
    makeRoom(3, 100_000, 31, 4),
    makeRoom(4, 100_000, 41, 4),
  ];
  const query = { destination: "da-lat", checkIn: "2027-01-10", checkOut: "2027-01-12", guests: 2, rooms: 1 };

  it("chỉ khách sạn hiển thị được ở đúng điểm đến; phòng rẻ nhất đủ chỗ; tổng tiền cả kỳ; sắp theo tổng tiền", () => {
    const result = searchHotels(hotels, rooms, destinations, query);
    expect(result.destination?.name).toBe("Đà Lạt");
    expect(result.items.map((h) => [h.id, h.room.id, h.nights, h.totalPrice])).toEqual([
      [2, 21, 2, 1_600_000],
      [1, 11, 2, 4_000_000],
    ]);
  });

  it("đổi số khách thì đổi phòng phù hợp, khách sạn không có phòng đủ chỗ bị bỏ", () => {
    const result = searchHotels(hotels, rooms, destinations, { ...query, guests: 4 });
    expect(result.items.map((h) => [h.id, h.room.id, h.totalPrice])).toEqual([[2, 22, 2_200_000]]);
  });

  it("nhiều phòng: nhân thêm số phòng", () => {
    const result = searchHotels(hotels, rooms, destinations, { ...query, guests: 4, rooms: 2 });
    expect(result.items.map((h) => [h.id, h.room.id, h.totalPrice])).toEqual([
      [2, 21, 3_200_000],
      [1, 11, 8_000_000],
    ]);
  });

  it("điểm đến không có → không có kết quả", () => {
    expect(searchHotels(hotels, rooms, destinations, { ...query, destination: "sao-hoa" })).toEqual({
      destination: null,
      items: [],
    });
  });
});
