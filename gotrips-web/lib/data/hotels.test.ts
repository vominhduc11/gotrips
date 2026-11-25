import { beforeEach, describe, expect, it, vi } from "vitest";

// `server-only` ném lỗi ngoài môi trường server của Next; `next/cache` chỉ có nghĩa bên trong Next (ở đây cacheLife/cacheTag
// không làm gì, còn directive "use cache" bị bỏ qua nên hàm chạy như hàm thường).
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));

const { searchHotelsApi, getHotelApi, listFeaturedHotelsApi } = vi.hoisted(() => ({
  searchHotelsApi: vi.fn(),
  getHotelApi: vi.fn(),
  listFeaturedHotelsApi: vi.fn(),
}));
vi.mock("@/lib/api/generated", () => ({
  searchHotels: searchHotelsApi,
  getHotel: getHotelApi,
  listFeaturedHotels: listFeaturedHotelsApi,
}));

import { ApiError } from "@/lib/api/http";
import { parseHotelSearchParams } from "@/lib/schemas/hotel-search";
import { getFeaturedHotels, getHotelDetail, getHotels, searchHotels } from "./hotels";

beforeEach(() => {
  searchHotelsApi.mockReset();
  getHotelApi.mockReset();
  listFeaturedHotelsApi.mockReset();
});

describe("searchHotels", () => {
  const query = parseHotelSearchParams(
    { destination: "da-lat", checkIn: "2027-01-10", checkOut: "2027-01-12", guests: "3", rooms: "1" },
    "2026-11-25",
  )!;

  it("gọi GET /hotels với lượt tìm đã ánh xạ và trả nguyên dữ liệu của API (web không tự lọc/tính tiền)", async () => {
    const result = { destinationName: "Đà Lạt", items: [{ id: 2, totalPrice: 2_550_000 }] };
    searchHotelsApi.mockResolvedValue({ data: result, status: 200 });

    await expect(searchHotels(query)).resolves.toBe(result);

    expect(searchHotelsApi).toHaveBeenCalledTimes(1);
    expect(searchHotelsApi.mock.calls[0][0]).toEqual({
      destination: "da-lat",
      checkIn: "2027-01-10",
      checkOut: "2027-01-12",
      guests: 3,
      rooms: 1,
    });
    // Có timeout riêng cho lời gọi danh mục (không dùng mặc định 10 giây của http.ts).
    expect(searchHotelsApi.mock.calls[0][1]).toHaveProperty("signal");
  });

  it("API lỗi thì ném lỗi ra (không nuốt thành danh sách rỗng, để Next không cache kết quả sai)", async () => {
    searchHotelsApi.mockRejectedValue(new ApiError({ status: 500, title: "Internal Server Error" }));

    await expect(searchHotels(query)).rejects.toBeInstanceOf(ApiError);
  });
});

describe("getHotelDetail", () => {
  it("trả chi tiết khách sạn từ API", async () => {
    const detail = { id: 1, slug: "khach-san-doi-may-da-lat", roomTypes: [] };
    getHotelApi.mockResolvedValue({ data: detail, status: 200 });

    await expect(getHotelDetail("khach-san-doi-may-da-lat")).resolves.toBe(detail);
    expect(getHotelApi.mock.calls[0][0]).toBe("khach-san-doi-may-da-lat");
    expect(getHotelApi.mock.calls[0][1]).toHaveProperty("signal");
  });

  it("API trả 404 (không có khách sạn, bị ẩn hoặc chưa có phòng) → null để trang hiện 404", async () => {
    getHotelApi.mockRejectedValue(new ApiError({ status: 404, title: "Không tìm thấy" }));

    await expect(getHotelDetail("khong-co")).resolves.toBeNull();
  });

  it("lỗi khác 404 (API sập, 5xx, hết thời gian) vẫn ném ra, không bị coi là 'không tìm thấy'", async () => {
    getHotelApi.mockRejectedValue(new ApiError({ status: 503, title: "Service Unavailable" }));
    await expect(getHotelDetail("khach-san-doi-may-da-lat")).rejects.toMatchObject({ status: 503 });

    getHotelApi.mockRejectedValue(new TypeError("fetch failed"));
    await expect(getHotelDetail("khach-san-doi-may-da-lat")).rejects.toBeInstanceOf(TypeError);
  });

  it.each(["../auth/me", "a/b", "Khach-San", "", "?x=1", "featured"])(
    "slug sai định dạng %j → null mà không gọi API",
    async (slug) => {
      await expect(getHotelDetail(slug)).resolves.toBeNull();
      expect(getHotelApi).not.toHaveBeenCalled();
    },
  );
});

describe("getHotels / getFeaturedHotels", () => {
  it("danh sách gợi ý của /hotels dùng endpoint nổi bật với limit tối đa (50)", async () => {
    const list = [{ id: 3 }, { id: 7 }];
    listFeaturedHotelsApi.mockResolvedValue({ data: list, status: 200 });

    await expect(getHotels()).resolves.toBe(list);
    expect(listFeaturedHotelsApi.mock.calls[0][0]).toEqual({ limit: 50 });
  });

  it("section Trang chủ truyền limit của nó (mặc định 4)", async () => {
    listFeaturedHotelsApi.mockResolvedValue({ data: [], status: 200 });

    await getFeaturedHotels();
    await getFeaturedHotels(2);

    expect(listFeaturedHotelsApi.mock.calls.map((call) => call[0])).toEqual([{ limit: 4 }, { limit: 2 }]);
  });

  it("API lỗi thì ném lỗi ra", async () => {
    listFeaturedHotelsApi.mockRejectedValue(new ApiError({ status: 502, title: "Bad Gateway" }));

    await expect(getHotels()).rejects.toBeInstanceOf(ApiError);
  });
});
