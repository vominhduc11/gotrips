import { describe, expect, it } from "vitest";
import { SearchToursSort } from "@/lib/api/generated/model";
import { DEFAULT_TOUR_SORT, parseTourFilters, TOUR_SORT_OPTIONS } from "@/lib/schemas/tour-filters";
import { isValidTourSlug, toSearchToursParams } from "./tour-request";

describe("toSearchToursParams", () => {
  it("không lọc gì → chỉ có sắp xếp mặc định và trang 1 (trường vắng mặt là undefined để không gửi lên URL)", () => {
    expect(toSearchToursParams(parseTourFilters({}))).toEqual({
      destination: undefined,
      q: undefined,
      date: undefined,
      guests: undefined,
      sort: SearchToursSort.FEATURED,
      page: 1,
    });
  });

  it("chuyển đủ các bộ lọc", () => {
    const params = toSearchToursParams(
      parseTourFilters({ destination: "da-lat", q: "ngàn hoa", date: "2027-01-23", guests: "3", sort: "gia-tang", page: "2" }),
    );

    expect(params).toEqual({
      destination: "da-lat",
      q: "ngàn hoa",
      date: "2027-01-23",
      guests: 3,
      sort: SearchToursSort.PRICE_ASC,
      page: 2,
    });
  });

  it("mọi kiểu sắp xếp trên URL đều có tương ứng ở API, và khác nhau", () => {
    const apiSorts = TOUR_SORT_OPTIONS.map((option) => toSearchToursParams(parseTourFilters({ sort: option.value })).sort);

    expect(apiSorts.every((sort) => sort !== undefined && Object.values(SearchToursSort).includes(sort))).toBe(true);
    expect(new Set(apiSorts).size).toBe(TOUR_SORT_OPTIONS.length);
  });

  it("mặc định của URL ứng với mặc định của API (không đổi thứ tự khi khách không chọn)", () => {
    expect(toSearchToursParams(parseTourFilters({ sort: DEFAULT_TOUR_SORT })).sort).toBe(SearchToursSort.FEATURED);
  });
});

describe("isValidTourSlug", () => {
  it.each(["da-lat-3n2d-thanh-pho-ngan-hoa", "phu-quoc", "a", "tour-2"])("%s hợp lệ", (slug) => {
    expect(isValidTourSlug(slug)).toBe(true);
  });

  it.each([
    "",
    "../destinations", // lên thư mục cha: sang endpoint khác của API
    "..%2Fauth%2Fme",
    "a/b",
    "featured/extra",
    "?limit=1",
    "featured", // có endpoint riêng (/tours/featured trả danh sách chứ không 404): không được coi là một tour
    "Da-Lat", // chữ hoa: DB chỉ chứa slug chữ thường
    "da lat",
    "-da-lat",
    "da-lat-",
    "da--lat",
    "đà-lạt",
    "x".repeat(151),
  ])("%j không hợp lệ", (slug) => {
    expect(isValidTourSlug(slug)).toBe(false);
  });

  it("đúng 150 ký tự vẫn hợp lệ", () => {
    expect(isValidTourSlug("x".repeat(150))).toBe(true);
  });
});
