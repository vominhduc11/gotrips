import { describe, expect, it } from "vitest";
import {
  buildFlightBookingHref,
  buildFlightResultsHref,
  createFlightBookingFormSchema,
  createFlightBookingRequestSchema,
  createStartFlightBookingSchema,
  isFlightSelectionComplete,
  parseFlightBookingParams,
  passengerTypesFor,
} from "./flight-booking";
import type { FlightSearchValues } from "./flight-search";

const TODAY = "2027-01-01";
const oneWay: FlightSearchValues = {
  tripType: "oneWay",
  from: "SGN",
  to: "HAN",
  departDate: "2027-01-10",
  returnDate: "",
  adults: 1,
  children: 1,
  infants: 1,
  cabin: "economy",
};
const roundTrip: FlightSearchValues = { ...oneWay, tripType: "roundTrip", returnDate: "2027-01-15" };

const contact = { fullName: "Nguyễn Minh Anh", email: "test@gmail.com", phone: "0901 234 567" };
const passengers = [
  { type: "adult" as const, fullName: "Nguyễn Minh Anh", dateOfBirth: "" },
  { type: "child" as const, fullName: "Nguyễn Minh Khang", dateOfBirth: "2019-05-01" },
  { type: "infant" as const, fullName: "Nguyễn Bảo An", dateOfBirth: "2026-03-01" },
];

function fieldErrors(result: { error?: { issues: { path: PropertyKey[]; message: string }[] } }) {
  // Lỗi ĐẦU TIÊN của mỗi ô (giống `toFieldErrors` và cách form hiển thị).
  const errors: Record<string, string> = {};
  for (const issue of result.error?.issues ?? []) errors[issue.path.join(".")] ??= issue.message;
  return errors;
}

describe("URL kết quả / đặt vé", () => {
  it("build ↔ parse khớp nhau, kèm chuyến đã chọn và bước", () => {
    const href = buildFlightBookingHref(roundTrip, { out: 2, ret: 7 }, "xac-nhan");
    expect(href.startsWith("/flights/book?tripType=roundTrip&from=SGN&to=HAN")).toBe(true);
    const raw = Object.fromEntries(new URL(href, "http://x").searchParams);
    expect(parseFlightBookingParams(raw, TODAY)).toEqual({
      search: roundTrip,
      selection: { out: 2, ret: 7 },
      step: "xac-nhan",
    });
  });

  it("một chiều thì bỏ `ret` dù URL còn sót", () => {
    expect(buildFlightResultsHref(oneWay, { out: 2, ret: 7 })).not.toContain("ret=");
    const raw = { ...Object.fromEntries(new URLSearchParams(buildFlightResultsHref(oneWay).split("?")[1])), ret: "7" };
    expect(parseFlightBookingParams(raw, TODAY).selection).toEqual({ out: undefined, ret: undefined });
  });

  it("lượt tìm sai → search null; id rác → bỏ", () => {
    expect(parseFlightBookingParams({ from: "SGN", out: "x" }, TODAY)).toEqual({
      search: null,
      selection: { out: undefined, ret: undefined },
      step: "thong-tin",
    });
  });

  it("isFlightSelectionComplete: khứ hồi cần cả chiều về", () => {
    expect(isFlightSelectionComplete(oneWay, { out: 2 })).toBe(true);
    expect(isFlightSelectionComplete(roundTrip, { out: 2 })).toBe(false);
    expect(isFlightSelectionComplete(roundTrip, { out: 2, ret: 7 })).toBe(true);
  });
});

describe("createStartFlightBookingSchema", () => {
  const schema = createStartFlightBookingSchema(TODAY);
  it("khứ hồi mà thiếu chiều về bị từ chối", () => {
    expect(schema.safeParse({ search: oneWay, outboundId: 2, returnId: 0 }).success).toBe(true);
    expect(fieldErrors(schema.safeParse({ search: roundTrip, outboundId: 2, returnId: 0 })).returnId).toBe(
      "Vui lòng chọn chuyến về.",
    );
  });
});

describe("hành khách", () => {
  it("passengerTypesFor: người lớn, trẻ em, rồi em bé", () => {
    expect(passengerTypesFor({ adults: 2, children: 1, infants: 1 })).toEqual(["adult", "adult", "child", "infant"]);
  });

  const schema = createFlightBookingFormSchema(oneWay.departDate, TODAY);
  const form = (list = passengers) => ({ contact, passengers: list, note: "" });

  it("hợp lệ khi tuổi khớp loại hành khách vào ngày bay", () => {
    expect(schema.safeParse(form()).success).toBe(true);
  });

  it("trẻ em / em bé bắt buộc ngày sinh; người lớn thì không", () => {
    const list = passengers.map((p) => ({ ...p, dateOfBirth: "" }));
    expect(fieldErrors(schema.safeParse(form(list)))).toEqual({
      "passengers.1.dateOfBirth": "Vui lòng nhập ngày sinh để kiểm tra độ tuổi.",
      "passengers.2.dateOfBirth": "Vui lòng nhập ngày sinh để kiểm tra độ tuổi.",
    });
  });

  it("tuổi không khớp loại → báo đúng ô", () => {
    const list = [
      { ...passengers[0]!, dateOfBirth: "2018-01-01" }, // 9 tuổi nhưng là "người lớn"
      { ...passengers[1]!, dateOfBirth: "2025-06-01" }, // 1 tuổi nhưng là "trẻ em"
      { ...passengers[2]!, dateOfBirth: "2024-01-09" }, // tròn 3 tuổi vào ngày bay nhưng là "em bé"
    ];
    expect(fieldErrors(schema.safeParse(form(list)))).toEqual({
      "passengers.0.dateOfBirth": "Người lớn phải từ 12 tuổi trở lên vào ngày bay.",
      "passengers.1.dateOfBirth": "Trẻ em phải từ 2 đến dưới 12 tuổi vào ngày bay.",
      "passengers.2.dateOfBirth": "Em bé phải dưới 2 tuổi vào ngày bay.",
    });
  });

  it("tuổi tính đúng ngày bay: tròn 2 tuổi đúng hôm bay thì đã là trẻ em", () => {
    const infantTurning2 = [{ ...passengers[2]!, dateOfBirth: "2025-01-10" }];
    expect(fieldErrors(createFlightBookingFormSchema("2027-01-10", TODAY).safeParse(form(infantTurning2)))).toEqual({
      "passengers.0.dateOfBirth": "Em bé phải dưới 2 tuổi vào ngày bay.",
    });
    expect(createFlightBookingFormSchema("2027-01-09", TODAY).safeParse(form(infantTurning2)).success).toBe(true);
  });

  it("ngày sinh sau hôm nay bị từ chối", () => {
    const list = [{ ...passengers[2]!, dateOfBirth: "2027-01-05" }];
    expect(fieldErrors(schema.safeParse(form(list)))["passengers.0.dateOfBirth"]).toBe("Ngày sinh không được sau hôm nay.");
  });
});

describe("createFlightBookingRequestSchema", () => {
  const schema = createFlightBookingRequestSchema(TODAY);
  const request = { search: oneWay, outboundId: 2, returnId: 0, contact, passengers, note: "" };

  it("hợp lệ; không nhận trường giá", () => {
    const parsed = schema.safeParse({ ...request, totalAmount: 1 });
    expect(parsed.success).toBe(true);
    expect(parsed.data).not.toHaveProperty("totalAmount");
  });

  it("danh sách hành khách phải đúng số lượng và thứ tự loại như lượt tìm", () => {
    expect(fieldErrors(schema.safeParse({ ...request, passengers: passengers.slice(0, 2) })).passengers).toBe(
      "Danh sách hành khách không khớp số hành khách đã tìm.",
    );
    const swapped = [passengers[0]!, { ...passengers[1]!, type: "infant" as const }, passengers[2]!];
    expect(schema.safeParse({ ...request, passengers: swapped }).success).toBe(false);
  });

  it("lượt tìm cũng được kiểm lại (ngày đã qua)", () => {
    expect(schema.safeParse({ ...request, search: { ...oneWay, departDate: "2026-12-31" } }).success).toBe(false);
  });
});
