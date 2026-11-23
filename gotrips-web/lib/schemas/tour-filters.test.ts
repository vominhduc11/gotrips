import { describe, expect, it } from "vitest";
import { buildTourListHref, parseTourFilters } from "./tour-filters";

describe("parseTourFilters", () => {
  it("không có tham số → giá trị mặc định", () => {
    expect(parseTourFilters({})).toEqual({
      destination: undefined,
      q: undefined,
      date: undefined,
      guests: undefined,
      sort: "noi-bat",
      page: 1,
    });
  });

  it("đọc đủ tham số hợp lệ (số khách/trang từ chuỗi)", () => {
    expect(
      parseTourFilters({ destination: "da-lat", date: "2027-01-09", guests: "3", sort: "gia-tang", page: "2" }),
    ).toMatchObject({ destination: "da-lat", date: "2027-01-09", guests: 3, sort: "gia-tang", page: 2 });
  });

  it("tham số rác bị bỏ qua thay vì làm lỗi trang", () => {
    expect(
      parseTourFilters({ date: "mai", guests: "abc", sort: "xyz", page: "-4", q: "" }),
    ).toMatchObject({ date: undefined, guests: undefined, sort: "noi-bat", page: 1, q: undefined });
    expect(parseTourFilters({ guests: "0" }).guests).toBeUndefined();
    expect(parseTourFilters({ page: "1.5" }).page).toBe(1);
  });

  it("tham số lặp lấy giá trị đầu; q quá dài bị bỏ", () => {
    expect(parseTourFilters({ destination: ["sapa", "da-lat"] }).destination).toBe("sapa");
    expect(parseTourFilters({ q: "a".repeat(101) }).q).toBeUndefined();
  });
});

describe("buildTourListHref", () => {
  const base = parseTourFilters({});

  it("bộ lọc rỗng → /tours", () => {
    expect(buildTourListHref(base)).toBe("/tours");
  });

  it("bỏ tham số mặc định, giữ các bộ lọc còn lại", () => {
    const filters = parseTourFilters({ destination: "sapa", guests: "2", page: "3" });
    expect(buildTourListHref(filters, { sort: "gia-giam", page: 2 })).toBe(
      "/tours?destination=sapa&guests=2&sort=gia-giam&page=2",
    );
  });

  it("đổi bộ lọc mà không chỉ định trang thì về trang 1", () => {
    const filters = parseTourFilters({ destination: "sapa", page: "3" });
    expect(buildTourListHref(filters, { destination: "da-lat" })).toBe("/tours?destination=da-lat");
    expect(buildTourListHref(filters, { destination: undefined })).toBe("/tours");
  });

  it("mã hoá ký tự đặc biệt trong q", () => {
    expect(buildTourListHref(parseTourFilters({ q: "đà lạt & biển" }))).toBe(
      "/tours?q=%C4%91%C3%A0+l%E1%BA%A1t+%26+bi%E1%BB%83n",
    );
  });
});
