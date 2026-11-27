import { describe, expect, it } from "vitest";
import type { z } from "zod";
import {
  buildBookingHref,
  buildBookingSearch,
  buildTourBookingHref,
  createBookingFormSchema,
  createBookingRequestSchema,
  MAX_GUESTS_PER_BOOKING,
  parseBookingParams,
  startBookingRequestSchema,
  tripSelectionSchema,
  type BookingFormValues,
} from "./booking";

// Cố định "hôm nay" để test không phụ thuộc đồng hồ máy.
const TODAY = "2026-11-23";
const schema = createBookingFormSchema(TODAY);

const valid: BookingFormValues = {
  departureId: 8,
  guests: 2,
  contact: { fullName: "Nguyễn Minh Anh", email: "minhanh@example.com", phone: "0901 234 567" },
  travelers: [
    { fullName: "Nguyễn Minh Anh", dateOfBirth: "1995-04-12" },
    { fullName: "Trần Văn Bình", dateOfBirth: "" },
  ],
  note: "",
};

/** `{ "đường.dẫn": [thông báo...] }` để assert gọn. */
function errorsOf(input: unknown, target: z.ZodType = schema) {
  const result = target.safeParse(input);
  if (result.success) return null;
  const byPath: Record<string, string[]> = {};
  for (const issue of result.error.issues) (byPath[issue.path.join(".")] ??= []).push(issue.message);
  return byPath;
}

describe("parseBookingParams", () => {
  it("đọc đúng tham số hợp lệ", () => {
    expect(parseBookingParams({ departure: "8", guests: "3", step: "thong-tin" })).toEqual({
      departure: 8,
      guests: 3,
      step: "thong-tin",
    });
  });

  it("giá trị rác rơi về mặc định thay vì làm trang lỗi", () => {
    expect(parseBookingParams({ departure: "abc", guests: "-2", step: "thanh-toan" })).toEqual({
      departure: undefined,
      guests: 1,
      step: "thong-tin",
    });
    // "chon-lich" là bước cũ (nay chọn lịch ở trang chi tiết) → bước mặc định.
    expect(parseBookingParams({ step: "chon-lich" }).step).toBe("thong-tin");
    expect(parseBookingParams({})).toEqual({ departure: undefined, guests: 1, step: "thong-tin" });
  });

  it("số khách vượt giới hạn mỗi đơn bị bỏ, tham số lặp lấy giá trị đầu", () => {
    expect(parseBookingParams({ guests: String(MAX_GUESTS_PER_BOOKING + 1) }).guests).toBe(1);
    expect(parseBookingParams({ departure: ["5", "9"] }).departure).toBe(5);
  });
});

describe("buildBookingSearch / buildBookingHref", () => {
  it("bỏ giá trị mặc định để URL gọn", () => {
    expect(buildBookingSearch({ departure: undefined, guests: 1, step: "thong-tin" })).toBe("");
    expect(buildBookingHref("da-lat-3n2d", { departure: 8, guests: 1, step: "thong-tin" })).toBe(
      "/tours/da-lat-3n2d/book?departure=8",
    );
  });

  it("đi vòng parse → build → parse không đổi", () => {
    const params = { departure: 8, guests: 2, step: "xac-nhan" as const };
    const search = buildBookingSearch(params);
    expect(search).toBe("departure=8&guests=2&step=xac-nhan");
    expect(parseBookingParams(Object.fromEntries(new URLSearchParams(search)))).toEqual(params);
  });
});

describe("buildTourBookingHref", () => {
  it("về trang chi tiết, điền sẵn chuyến + số khách và cuộn tới thẻ Đặt tour", () => {
    expect(buildTourBookingHref("da-lat-3n2d", { departure: 8, guests: 2 })).toBe(
      "/tours/da-lat-3n2d?departure=8&guests=2#dat-tour",
    );
    expect(buildTourBookingHref("da-lat-3n2d", { departure: undefined, guests: 1 })).toBe("/tours/da-lat-3n2d#dat-tour");
  });
});

describe("tripSelectionSchema", () => {
  it("cần chọn chuyến và số khách trong 1..giới hạn mỗi đơn", () => {
    expect(tripSelectionSchema.safeParse({ departureId: 8, guests: 2 }).success).toBe(true);
    expect(errorsOf({ departureId: 0, guests: 1 }, tripSelectionSchema)).toEqual({
      departureId: ["Vui lòng chọn ngày khởi hành."],
    });
    expect(errorsOf({ departureId: 8, guests: MAX_GUESTS_PER_BOOKING + 1 }, tripSelectionSchema)).toHaveProperty("guests");
  });
});

describe("startBookingRequestSchema", () => {
  it("slug chỉ nhận chữ thường, số và gạch nối (slug đi vào đường dẫn chuyển hướng)", () => {
    const base = { departureId: 8, guests: 2 };
    expect(startBookingRequestSchema.safeParse({ ...base, tourSlug: "da-lat-3n2d" }).success).toBe(true);
    for (const tourSlug of ["", "../admin", "//evil.com", "da lat"]) {
      expect(startBookingRequestSchema.safeParse({ ...base, tourSlug }).success).toBe(false);
    }
  });
});

describe("createBookingFormSchema", () => {
  it("chấp nhận dữ liệu hợp lệ (ngày sinh bỏ trống được)", () => {
    expect(errorsOf(valid)).toBeNull();
  });

  it("chưa chọn chuyến (departureId = 0) báo lỗi tiếng Việt", () => {
    expect(errorsOf({ ...valid, departureId: 0 })).toEqual({ departureId: ["Vui lòng chọn ngày khởi hành."] });
  });

  it("số người đi phải bằng số khách", () => {
    expect(errorsOf({ ...valid, guests: 3 })).toEqual({ travelers: ["Số người đi phải bằng số khách đã chọn."] });
  });

  it("số khách nằm trong 1..giới hạn mỗi đơn", () => {
    expect(errorsOf({ ...valid, guests: 0, travelers: [] })).toHaveProperty("guests");
    expect(errorsOf({ ...valid, guests: MAX_GUESTS_PER_BOOKING + 1 })).toHaveProperty("guests");
  });

  it.each(["0901234567", "0901 234 567", "090.123.4567", "+84901234567", "0387654321"])(
    "nhận số điện thoại di động VN: %s",
    (phone) => {
      expect(errorsOf({ ...valid, contact: { ...valid.contact, phone } })).toBeNull();
    },
  );

  it.each(["", "12345", "0201234567", "09012345678", "abc0901234567"])("từ chối số điện thoại: '%s'", (phone) => {
    expect(errorsOf({ ...valid, contact: { ...valid.contact, phone } })).toHaveProperty("contact.phone");
  });

  it("họ tên người đi bắt buộc, báo đúng dòng", () => {
    const travelers = [valid.travelers[0]!, { fullName: "  ", dateOfBirth: "" }];
    const errors = errorsOf({ ...valid, travelers });
    expect(Object.keys(errors ?? {})).toEqual(["travelers.1.fullName"]);
    // Form hiện lỗi đầu tiên của ô (như form đăng ký): "chưa nhập" đứng trước "quá ngắn".
    expect(errors?.["travelers.1.fullName"]?.[0]).toBe("Vui lòng nhập họ tên người đi.");
  });

  it("ngày sinh không được sau hôm nay và phải đúng định dạng", () => {
    const withDob = (dateOfBirth: string) => ({ ...valid, travelers: [{ ...valid.travelers[0]!, dateOfBirth }, valid.travelers[1]!] });
    expect(errorsOf(withDob(TODAY))).toBeNull();
    expect(errorsOf(withDob("2026-11-24"))).toEqual({ "travelers.0.dateOfBirth": ["Ngày sinh không được sau hôm nay."] });
    expect(errorsOf(withDob("12/04/1995"))).toHaveProperty("travelers.0.dateOfBirth");
  });

  it("email sai định dạng và ghi chú quá dài bị báo", () => {
    expect(errorsOf({ ...valid, contact: { ...valid.contact, email: "khong-phai-email" } })).toHaveProperty(
      "contact.email",
    );
    expect(errorsOf({ ...valid, note: "a".repeat(501) })).toHaveProperty("note");
  });
});

describe("createBookingRequestSchema", () => {
  const request = createBookingRequestSchema(TODAY);

  it("cần thêm tourSlug, và vẫn kiểm chéo số người đi", () => {
    expect(errorsOf(valid, request)).toHaveProperty("tourSlug");
    expect(errorsOf({ ...valid, tourSlug: "phu-quoc" }, request)).toBeNull();
    expect(errorsOf({ ...valid, tourSlug: "phu-quoc", guests: 1 }, request)).toHaveProperty("travelers");
  });

  it("bỏ qua trường giá client tự thêm (server tự tính giá)", () => {
    const result = request.safeParse({ ...valid, tourSlug: "phu-quoc", unitPrice: 1, totalAmount: 1 });
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty("unitPrice");
    expect(result.data).not.toHaveProperty("totalAmount");
  });
});
