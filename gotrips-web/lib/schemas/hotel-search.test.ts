import { describe, expect, it } from "vitest";
import {
  buildHotelSearchParams,
  createHotelSearchSchema,
  hasHotelSearchParams,
  HOTEL_MAX_GUESTS,
  HOTEL_MAX_NIGHTS,
  HOTEL_MAX_ROOMS,
  parseHotelSearchParams,
  type HotelSearchValues,
} from "./hotel-search";

// Cố định "hôm nay" để test không phụ thuộc đồng hồ máy.
const TODAY = "2026-12-01";
const schema = createHotelSearchSchema(TODAY);

const valid: HotelSearchValues = {
  destination: "da-lat",
  checkIn: "2026-12-10",
  checkOut: "2026-12-12",
  guests: 2,
  rooms: 1,
};

/** Trả về `{ trường: [thông báo...] }` để assert gọn. */
function errorsOf(input: unknown) {
  const result = schema.safeParse(input);
  if (result.success) return null;
  const byField: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "");
    (byField[key] ??= []).push(issue.message);
  }
  return byField;
}

describe("hotelSearchSchema", () => {
  it("chấp nhận dữ liệu hợp lệ", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it("báo thiếu điểm đến và hai ngày khi để trống", () => {
    const errors = errorsOf({ ...valid, destination: "", checkIn: "", checkOut: "" });
    expect(errors?.destination).toContain("Vui lòng chọn điểm đến.");
    expect(errors?.checkIn).toContain("Vui lòng chọn ngày nhận phòng.");
    expect(errors?.checkOut).toContain("Vui lòng chọn ngày trả phòng.");
  });

  describe("ngày nhận phòng", () => {
    it("cho phép đúng ngày hôm nay", () => {
      expect(schema.safeParse({ ...valid, checkIn: TODAY, checkOut: "2026-12-02" }).success).toBe(true);
    });

    it("từ chối ngày trong quá khứ", () => {
      const errors = errorsOf({ ...valid, checkIn: "2026-11-30", checkOut: "2026-12-05" });
      expect(errors?.checkIn).toContain("Ngày nhận phòng không được ở quá khứ.");
    });

    it("từ chối ngày không có thật hoặc sai định dạng", () => {
      expect(errorsOf({ ...valid, checkIn: "2027-02-30" })?.checkIn).toContain("Ngày chưa đúng định dạng.");
      expect(errorsOf({ ...valid, checkIn: "10/12/2026" })?.checkIn).toContain("Ngày chưa đúng định dạng.");
    });
  });

  describe("ngày trả phòng", () => {
    it("phải sau ngày nhận (trùng ngày bị từ chối)", () => {
      const sameDay = errorsOf({ ...valid, checkOut: valid.checkIn });
      expect(sameDay?.checkOut).toContain("Ngày trả phòng phải sau ngày nhận phòng.");
    });

    it("trước ngày nhận bị từ chối", () => {
      const before = errorsOf({ ...valid, checkOut: "2026-12-09" });
      expect(before?.checkOut).toContain("Ngày trả phòng phải sau ngày nhận phòng.");
    });

    it("đúng 1 đêm là hợp lệ", () => {
      expect(schema.safeParse({ ...valid, checkOut: "2026-12-11" }).success).toBe(true);
    });
  });

  describe("số khách và số phòng", () => {
    it("số phòng bằng số khách là hợp lệ", () => {
      expect(schema.safeParse({ ...valid, guests: 3, rooms: 3 }).success).toBe(true);
    });

    it("số phòng nhiều hơn số khách bị từ chối", () => {
      const errors = errorsOf({ ...valid, guests: 1, rooms: 2 });
      expect(errors?.rooms).toContain("Số phòng không được nhiều hơn số khách.");
    });

    it("từ chối 0, số lẻ, NaN và vượt giới hạn", () => {
      expect(errorsOf({ ...valid, guests: 0 })?.guests).toBeDefined();
      expect(errorsOf({ ...valid, guests: 1.5 })?.guests).toBeDefined();
      expect(errorsOf({ ...valid, guests: Number.NaN })?.guests).toBeDefined();
      expect(errorsOf({ ...valid, guests: HOTEL_MAX_GUESTS + 1 })?.guests).toBeDefined();
      expect(errorsOf({ ...valid, rooms: 0 })?.rooms).toBeDefined();
      expect(errorsOf({ ...valid, guests: HOTEL_MAX_GUESTS, rooms: HOTEL_MAX_ROOMS + 1 })?.rooms).toBeDefined();
    });
  });
});

describe("buildHotelSearchParams", () => {
  it("dựng đủ tham số theo đúng thứ tự của hợp đồng URL", () => {
    expect(buildHotelSearchParams(valid).toString()).toBe(
      "destination=da-lat&checkIn=2026-12-10&checkOut=2026-12-12&guests=2&rooms=1",
    );
  });

  it("mã hoá ký tự đặc biệt trong tham số", () => {
    const params = buildHotelSearchParams({ ...valid, destination: "ha long&x=1" });
    expect(params.get("destination")).toBe("ha long&x=1");
    expect(params.has("x")).toBe(false);
  });
});

describe("số đêm tối đa", () => {
  it(`đúng ${HOTEL_MAX_NIGHTS} đêm là hợp lệ, thêm 1 đêm thì bị từ chối (báo ở ngày trả)`, () => {
    expect(schema.safeParse({ ...valid, checkIn: "2026-12-10", checkOut: "2027-01-09" }).success).toBe(true);
    expect(errorsOf({ ...valid, checkIn: "2026-12-10", checkOut: "2027-01-10" })?.checkOut).toEqual([
      `Mỗi lần đặt tối đa ${HOTEL_MAX_NIGHTS} đêm.`,
    ]);
  });
});

describe("parseHotelSearchParams", () => {
  const url = Object.fromEntries(buildHotelSearchParams(valid));

  it("đọc lại đúng lượt tìm từ URL do form dựng", () => {
    expect(parseHotelSearchParams(url, TODAY)).toEqual(valid);
  });

  it("lấy giá trị đầu khi tham số bị lặp", () => {
    expect(parseHotelSearchParams({ ...url, guests: ["3", "9"] }, TODAY)?.guests).toBe(3);
  });

  it("thiếu hoặc sai bất kỳ tham số nào → null (không làm trang lỗi)", () => {
    expect(parseHotelSearchParams({}, TODAY)).toBeNull();
    expect(parseHotelSearchParams({ ...url, guests: undefined }, TODAY)).toBeNull();
    expect(parseHotelSearchParams({ ...url, guests: "hai" }, TODAY)).toBeNull();
    expect(parseHotelSearchParams({ ...url, rooms: "3", guests: "2" }, TODAY)).toBeNull();
    // Ngày nhận phòng đã qua so với "hôm nay".
    expect(parseHotelSearchParams(url, "2026-12-11")).toBeNull();
  });

  it("hasHotelSearchParams: biết khách đã thử tìm dù tham số sai", () => {
    expect(hasHotelSearchParams({})).toBe(false);
    expect(hasHotelSearchParams({ q: "x" })).toBe(false);
    expect(hasHotelSearchParams({ checkIn: "hôm qua" })).toBe(true);
  });
});
