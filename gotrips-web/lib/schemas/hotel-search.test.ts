import { describe, expect, it } from "vitest";
import {
  buildHotelSearchParams,
  createHotelPrefillSchema,
  createHotelSearchSchema,
  HOTEL_MAX_GUESTS,
  HOTEL_MAX_ROOMS,
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

describe("createHotelPrefillSchema", () => {
  const prefillSchema = createHotelPrefillSchema(["da-lat", "phu-quoc"]);

  it("nhận slug điểm đến có trong danh sách", () => {
    expect(prefillSchema.safeParse({ destination: "da-lat" }).data).toEqual({ destination: "da-lat" });
  });

  it("chỉ giữ destination: các khoá khác (ngày, số khách...) bị bỏ, không được điền sẵn", () => {
    const parsed = prefillSchema.safeParse({ destination: "phu-quoc", checkIn: "2026-12-10", guests: 9 });
    expect(parsed.data).toEqual({ destination: "phu-quoc" });
  });

  it("từ chối slug không có trong danh sách, kể cả tên hiển thị hay khác hoa/thường", () => {
    expect(prefillSchema.safeParse({ destination: "ha-long" }).success).toBe(false);
    expect(prefillSchema.safeParse({ destination: "Đà Lạt" }).success).toBe(false);
    expect(prefillSchema.safeParse({ destination: "DA-LAT" }).success).toBe(false);
    expect(prefillSchema.safeParse({ destination: "" }).success).toBe(false);
  });

  it("từ chối chuỗi lạ và tên thuộc tính có sẵn của Object", () => {
    for (const destination of ["<script>alert(1)</script>", "__proto__", "constructor", "toString"]) {
      expect(prefillSchema.safeParse({ destination }).success, destination).toBe(false);
    }
  });

  it("từ chối payload sai kiểu hoặc thiếu khoá", () => {
    for (const payload of [undefined, null, "da-lat", 42, ["da-lat"], {}, { destination: 1 }, { destination: null }]) {
      expect(prefillSchema.safeParse(payload).success, JSON.stringify(payload)).toBe(false);
    }
  });

  it("danh sách điểm đến rỗng thì không nhận gì", () => {
    expect(createHotelPrefillSchema([]).safeParse({ destination: "da-lat" }).success).toBe(false);
  });
});
