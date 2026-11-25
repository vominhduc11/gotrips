import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchToursSort } from "@/lib/api/generated/model";
import { parseTourFilters } from "@/lib/schemas/tour-filters";

// `server-only` ném lỗi ngoài môi trường server của Next; `next/cache` chỉ có nghĩa bên trong Next (ở đây cacheLife/cacheTag
// không làm gì, còn directive "use cache" bị bỏ qua nên hàm chạy như hàm thường).
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));

const { searchToursApi, getTourApi } = vi.hoisted(() => ({
  searchToursApi: vi.fn(),
  getTourApi: vi.fn(),
}));
vi.mock("@/lib/api/generated", () => ({ searchTours: searchToursApi, getTour: getTourApi }));

import { ApiError } from "@/lib/api/http";
import { getTourDetail, searchTours } from "./tours";

beforeEach(() => {
  searchToursApi.mockReset();
  getTourApi.mockReset();
});

describe("searchTours", () => {
  it("gọi GET /tours với bộ lọc đã ánh xạ và trả nguyên dữ liệu của API (web không tự lọc/sắp xếp/phân trang)", async () => {
    const page = { items: [{ id: 7 }], total: 9, page: 2, pageCount: 2, destinationName: "Đà Lạt" };
    searchToursApi.mockResolvedValue({ data: page, status: 200 });

    const result = await searchTours(
      parseTourFilters({ destination: "da-lat", q: "hoa", date: "2027-01-23", guests: "2", sort: "gia-giam", page: "2" }),
    );

    expect(result).toBe(page);
    expect(searchToursApi).toHaveBeenCalledTimes(1);
    expect(searchToursApi.mock.calls[0][0]).toEqual({
      destination: "da-lat",
      q: "hoa",
      date: "2027-01-23",
      guests: 2,
      sort: SearchToursSort.PRICE_DESC,
      page: 2,
    });
    // Có timeout riêng cho lời gọi danh mục (không dùng mặc định 10 giây của http.ts).
    expect(searchToursApi.mock.calls[0][1]).toHaveProperty("signal");
  });

  it("API lỗi thì ném lỗi ra (không nuốt thành danh sách rỗng, để Next không cache kết quả sai)", async () => {
    searchToursApi.mockRejectedValue(new ApiError({ status: 500, title: "Internal Server Error" }));

    await expect(searchTours(parseTourFilters({}))).rejects.toBeInstanceOf(ApiError);
  });
});

describe("getTourDetail", () => {
  it("trả chi tiết tour từ API", async () => {
    const detail = { id: 1, slug: "da-lat-3n2d", departures: [], testimonials: [] };
    getTourApi.mockResolvedValue({ data: detail, status: 200 });

    await expect(getTourDetail("da-lat-3n2d")).resolves.toBe(detail);
    expect(getTourApi.mock.calls[0][0]).toBe("da-lat-3n2d");
  });

  it("API trả 404 (không có tour hoặc tour bị ẩn) → null để trang hiện 404", async () => {
    getTourApi.mockRejectedValue(new ApiError({ status: 404, title: "Không tìm thấy" }));

    await expect(getTourDetail("khong-co")).resolves.toBeNull();
  });

  it("lỗi khác 404 (API sập, 5xx, hết thời gian) vẫn ném ra, không bị coi là 'không tìm thấy'", async () => {
    getTourApi.mockRejectedValue(new ApiError({ status: 503, title: "Service Unavailable" }));
    await expect(getTourDetail("da-lat-3n2d")).rejects.toMatchObject({ status: 503 });

    getTourApi.mockRejectedValue(new TypeError("fetch failed"));
    await expect(getTourDetail("da-lat-3n2d")).rejects.toBeInstanceOf(TypeError);
  });

  it.each(["../destinations", "a/b", "Da-Lat", "", "?x=1"])("slug sai định dạng %j → null mà không gọi API", async (slug) => {
    await expect(getTourDetail(slug)).resolves.toBeNull();
    expect(getTourApi).not.toHaveBeenCalled();
  });
});
