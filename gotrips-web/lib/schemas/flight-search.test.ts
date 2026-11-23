import { describe, expect, it } from "vitest";
import {
  buildFlightSearchParams,
  createFlightPrefillSchema,
  createFlightSearchSchema,
  FLIGHT_MAX_PASSENGERS,
  type FlightSearchValues,
} from "./flight-search";

// Cố định "hôm nay" để test không phụ thuộc đồng hồ máy.
const TODAY = "2026-12-01";
const schema = createFlightSearchSchema(TODAY);

const oneWay: FlightSearchValues = {
  tripType: "oneWay",
  from: "HAN",
  to: "SGN",
  departDate: "2026-12-10",
  returnDate: "",
  adults: 1,
  children: 0,
  infants: 0,
  cabin: "economy",
};

const roundTrip: FlightSearchValues = { ...oneWay, tripType: "roundTrip", returnDate: "2026-12-15" };

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

describe("flightSearchSchema", () => {
  it("chấp nhận chuyến một chiều và khứ hồi hợp lệ", () => {
    expect(schema.safeParse(oneWay).success).toBe(true);
    expect(schema.safeParse(roundTrip).success).toBe(true);
  });

  it("báo thiếu điểm đi, điểm đến và ngày đi khi để trống", () => {
    const errors = errorsOf({ ...oneWay, from: "", to: "", departDate: "" });
    expect(errors?.from).toContain("Vui lòng chọn điểm đi.");
    expect(errors?.to).toContain("Vui lòng chọn điểm đến.");
    expect(errors?.departDate).toContain("Vui lòng chọn ngày đi.");
  });

  describe("điểm đi và điểm đến", () => {
    it("trùng nhau bị từ chối, báo ở điểm đến", () => {
      const errors = errorsOf({ ...oneWay, to: "HAN" });
      expect(errors?.to).toContain("Điểm đến phải khác điểm đi.");
    });

    it("không báo trùng khi cả hai còn trống", () => {
      const errors = errorsOf({ ...oneWay, from: "", to: "" });
      expect(errors?.to).not.toContain("Điểm đến phải khác điểm đi.");
    });

    it("từ chối mã không phải 3 chữ in hoa", () => {
      expect(errorsOf({ ...oneWay, from: "han" })?.from).toBeDefined();
      expect(errorsOf({ ...oneWay, to: "SGNN" })?.to).toBeDefined();
    });
  });

  describe("ngày đi", () => {
    it("cho phép đúng ngày hôm nay", () => {
      expect(schema.safeParse({ ...oneWay, departDate: TODAY }).success).toBe(true);
    });

    it("từ chối ngày trong quá khứ", () => {
      expect(errorsOf({ ...oneWay, departDate: "2026-11-30" })?.departDate).toContain(
        "Ngày đi không được ở quá khứ.",
      );
    });

    it("từ chối ngày không có thật", () => {
      expect(errorsOf({ ...oneWay, departDate: "2027-02-30" })?.departDate).toContain("Ngày chưa đúng định dạng.");
    });
  });

  describe("ngày về", () => {
    it("khứ hồi mà thiếu ngày về thì báo lỗi", () => {
      expect(errorsOf({ ...roundTrip, returnDate: "" })?.returnDate).toContain("Vui lòng chọn ngày về.");
    });

    it("khứ hồi: ngày về trước ngày đi bị từ chối", () => {
      expect(errorsOf({ ...roundTrip, returnDate: "2026-12-09" })?.returnDate).toContain(
        "Ngày về không được trước ngày đi.",
      );
    });

    it("khứ hồi: về cùng ngày đi vẫn hợp lệ", () => {
      expect(schema.safeParse({ ...roundTrip, returnDate: roundTrip.departDate }).success).toBe(true);
    });

    it("một chiều: bỏ qua hoàn toàn ngày về", () => {
      expect(schema.safeParse({ ...oneWay, returnDate: "" }).success).toBe(true);
      // Ngày về còn sót từ lần chọn khứ hồi trước đó (thậm chí không hợp lệ) cũng không gây lỗi.
      expect(schema.safeParse({ ...oneWay, returnDate: "2020-01-01" }).success).toBe(true);
    });
  });

  describe("hành khách", () => {
    it("cần ít nhất 1 người lớn", () => {
      expect(errorsOf({ ...oneWay, adults: 0 })?.adults).toContain("Cần ít nhất 1 người lớn.");
    });

    it("em bé bằng số người lớn là hợp lệ, nhiều hơn thì bị từ chối", () => {
      expect(schema.safeParse({ ...oneWay, adults: 2, infants: 2 }).success).toBe(true);
      expect(errorsOf({ ...oneWay, adults: 1, infants: 2 })?.infants).toContain(
        "Số em bé không được nhiều hơn số người lớn.",
      );
    });

    it("tổng đúng 9 là hợp lệ, 10 thì bị từ chối", () => {
      expect(schema.safeParse({ ...oneWay, adults: 5, children: 3, infants: 1 }).success).toBe(true);
      const errors = errorsOf({ ...oneWay, adults: 5, children: 4, infants: 1 });
      expect(errors?.adults).toContain(`Tổng số hành khách tối đa là ${FLIGHT_MAX_PASSENGERS}.`);
    });

    it("từ chối số âm, số lẻ và NaN", () => {
      expect(errorsOf({ ...oneWay, children: -1 })?.children).toBeDefined();
      expect(errorsOf({ ...oneWay, children: 0.5 })?.children).toBeDefined();
      expect(errorsOf({ ...oneWay, adults: Number.NaN })?.adults).toBeDefined();
    });
  });

  it("từ chối hạng ghế lạ", () => {
    expect(errorsOf({ ...oneWay, cabin: "vip" })?.cabin).toBeDefined();
  });
});

describe("buildFlightSearchParams", () => {
  it("một chiều: không có returnDate", () => {
    expect(buildFlightSearchParams(oneWay).toString()).toBe(
      "tripType=oneWay&from=HAN&to=SGN&departDate=2026-12-10&adults=1&children=0&infants=0&cabin=economy",
    );
  });

  it("khứ hồi: có returnDate ngay sau departDate", () => {
    expect(buildFlightSearchParams({ ...roundTrip, adults: 2, children: 1, cabin: "business" }).toString()).toBe(
      "tripType=roundTrip&from=HAN&to=SGN&departDate=2026-12-10&returnDate=2026-12-15&adults=2&children=1&infants=0&cabin=business",
    );
  });

  it("một chiều bỏ returnDate dù giá trị còn sót lại", () => {
    expect(buildFlightSearchParams({ ...oneWay, returnDate: "2026-12-15" }).has("returnDate")).toBe(false);
  });
});

describe("createFlightPrefillSchema", () => {
  const prefillSchema = createFlightPrefillSchema(["SGN", "HAN", "DAD"]);

  it("nhận cặp mã sân bay có trong danh sách", () => {
    expect(prefillSchema.safeParse({ from: "SGN", to: "HAN" }).data).toEqual({ from: "SGN", to: "HAN" });
  });

  it("chỉ giữ from và to: loại hành trình, ngày, hành khách, hạng ghế bị bỏ, không được điền sẵn", () => {
    const parsed = prefillSchema.safeParse({
      from: "SGN",
      to: "DAD",
      tripType: "roundTrip",
      departDate: "2026-12-10",
      adults: 9,
      cabin: "first",
    });
    expect(parsed.data).toEqual({ from: "SGN", to: "DAD" });
  });

  it("từ chối mã không có trong danh sách hoặc sai định dạng", () => {
    expect(prefillSchema.safeParse({ from: "SGN", to: "PQC" }).success).toBe(false);
    expect(prefillSchema.safeParse({ from: "sgn", to: "HAN" }).success).toBe(false);
    expect(prefillSchema.safeParse({ from: "SGNN", to: "HAN" }).success).toBe(false);
    expect(prefillSchema.safeParse({ from: "", to: "HAN" }).success).toBe(false);
  });

  it("từ chối điểm đi trùng điểm đến (báo lỗi ở ô điểm đến)", () => {
    const parsed = prefillSchema.safeParse({ from: "SGN", to: "SGN" });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.path).toEqual(["to"]);
  });

  it("sai một đầu thì bỏ cả gói, không nhận nửa chừng", () => {
    expect(prefillSchema.safeParse({ from: "SGN", to: "<script>" }).success).toBe(false);
    expect(prefillSchema.safeParse({ from: "SGN" }).success).toBe(false);
    expect(prefillSchema.safeParse({ to: "HAN" }).success).toBe(false);
  });

  it("từ chối payload sai kiểu và tên thuộc tính có sẵn của Object", () => {
    for (const payload of [undefined, null, "SGN-HAN", 42, ["SGN", "HAN"], {}, { from: 1, to: 2 }]) {
      expect(prefillSchema.safeParse(payload).success, JSON.stringify(payload)).toBe(false);
    }
    expect(prefillSchema.safeParse({ from: "__proto__", to: "HAN" }).success).toBe(false);
  });
});
