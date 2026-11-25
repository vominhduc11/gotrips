import { describe, expect, it } from "vitest";
import { parseHotelSearchParams } from "@/lib/schemas/hotel-search";
import { isValidHotelSlug, toSearchHotelsParams } from "./hotel-request";

describe("toSearchHotelsParams", () => {
  it("chuyển đủ năm tham số của lượt tìm đã hợp lệ", () => {
    const query = parseHotelSearchParams(
      { destination: "da-lat", checkIn: "2027-01-10", checkOut: "2027-01-12", guests: "3", rooms: "2" },
      "2026-11-25",
    );
    expect(query).not.toBeNull();

    expect(toSearchHotelsParams(query!)).toEqual({
      destination: "da-lat",
      checkIn: "2027-01-10",
      checkOut: "2027-01-12",
      guests: 3,
      rooms: 2,
    });
  });
});

describe("parseHotelSearchParams (giới hạn gắn với API)", () => {
  const base = { checkIn: "2027-01-10", checkOut: "2027-01-12", guests: "2", rooms: "1" };

  it("slug điểm đến dài tới 100 ký tự vẫn hợp lệ, dài hơn thì bị loại (khớp @Size(max = 100) của API)", () => {
    expect(parseHotelSearchParams({ ...base, destination: "x".repeat(100) }, "2026-11-25")).not.toBeNull();
    expect(parseHotelSearchParams({ ...base, destination: "x".repeat(101) }, "2026-11-25")).toBeNull();
  });
});

describe("isValidHotelSlug", () => {
  it.each(["khach-san-doi-may-da-lat", "resort-bai-sao-phu-quoc", "a", "khach-san-2"])("%s hợp lệ", (slug) => {
    expect(isValidHotelSlug(slug)).toBe(true);
  });

  it.each([
    "",
    "../auth/me", // lên thư mục cha: sang endpoint khác của API
    "..%2Fauth%2Fme",
    "a/b",
    "doi-may/book",
    "?limit=1",
    "featured", // có endpoint riêng (/hotels/featured trả danh sách chứ không 404): không được coi là một khách sạn
    "Khach-San", // chữ hoa: DB chỉ chứa slug chữ thường
    "khach san",
    "-khach-san",
    "khach-san-",
    "khach--san",
    "khách-sạn",
    "x".repeat(151),
  ])("%j không hợp lệ", (slug) => {
    expect(isValidHotelSlug(slug)).toBe(false);
  });

  it("đúng 150 ký tự vẫn hợp lệ", () => {
    expect(isValidHotelSlug("x".repeat(150))).toBe(true);
  });
});
