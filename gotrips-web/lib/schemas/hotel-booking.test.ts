import { describe, expect, it } from "vitest";
import {
  buildHotelBookingHref,
  buildHotelDetailHref,
  buildHotelStaySearch,
  createHotelBookingRequestSchema,
  createHotelStaySchema,
  hotelBookingFormSchema,
  parseHotelStayParams,
  SAME_DAY_CHECK_IN_MESSAGE,
} from "./hotel-booking";

const TODAY = "2027-01-01";
const roomTypes = [
  { id: 1, maxGuests: 2 },
  { id: 2, maxGuests: 4 },
];
const stay = { roomTypeId: 1, checkIn: "2027-01-10", checkOut: "2027-01-12", guests: 2, rooms: 1 };
const selection = { room: 1, checkIn: "2027-01-10", checkOut: "2027-01-12", guests: 2, rooms: 1 };

function fieldErrors(result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) {
  // Lỗi ĐẦU TIÊN của mỗi ô (giống `toFieldErrors` và cách form hiển thị).
  const errors: Record<string, string> = {};
  for (const issue of result.error?.issues ?? []) errors[issue.path.join(".")] ??= issue.message;
  return errors;
}

describe("tham số URL", () => {
  it("parse: rác rơi về mặc định / bỏ trống, không làm trang lỗi", () => {
    expect(parseHotelStayParams({ room: "abc", checkIn: "2027-02-30", guests: "0", rooms: "x", step: "la" })).toEqual({
      room: undefined,
      checkIn: undefined,
      checkOut: undefined,
      guests: 2,
      rooms: 1,
      step: "thong-tin",
    });
  });

  it("build ↔ parse khớp nhau; bỏ giá trị mặc định cho URL gọn", () => {
    const search = buildHotelStaySearch({ ...selection, guests: 3 }, "xac-nhan");
    expect(search).toBe("room=1&checkIn=2027-01-10&checkOut=2027-01-12&guests=3&step=xac-nhan");
    expect(parseHotelStayParams(Object.fromEntries(new URLSearchParams(search)))).toEqual({
      ...selection,
      guests: 3,
      step: "xac-nhan",
    });
  });

  it("href trang đặt phòng và trang chi tiết (mặc định cuộn tới thẻ Đặt phòng)", () => {
    expect(buildHotelBookingHref("ks-a", selection)).toBe("/hotels/ks-a/book?room=1&checkIn=2027-01-10&checkOut=2027-01-12");
    expect(buildHotelDetailHref("ks-a", { guests: 4 })).toBe("/hotels/ks-a?guests=4#dat-phong");
    expect(buildHotelDetailHref("ks-a", {}, { scrollToCard: false })).toBe("/hotels/ks-a");
  });
});

describe("createHotelStaySchema", () => {
  const schema = createHotelStaySchema(roomTypes, TODAY);

  it("chấp nhận lựa chọn hợp lệ, nhận phòng sớm nhất là ngày mai", () => {
    expect(schema.safeParse(stay).success).toBe(true);
    expect(schema.safeParse({ ...stay, checkIn: "2027-01-02" }).success).toBe(true);
  });

  it("nhận phòng ngay hôm nay đã đóng đặt trực tuyến (cùng luật và câu với API)", () => {
    expect(fieldErrors(schema.safeParse({ ...stay, checkIn: TODAY }))).toEqual({ checkIn: SAME_DAY_CHECK_IN_MESSAGE });
    expect(SAME_DAY_CHECK_IN_MESSAGE).toBe(
      "Đặt phòng trực tuyến chỉ nhận phòng từ ngày mai. Bạn vui lòng chọn ngày khác.",
    );
  });

  it("phòng không thuộc khách sạn", () => {
    expect(fieldErrors(schema.safeParse({ ...stay, roomTypeId: 99 }))).toEqual({ roomTypeId: "Vui lòng chọn loại phòng." });
  });

  it("vượt sức chứa của loại phòng → báo ở số khách; thêm phòng thì hợp lệ", () => {
    expect(fieldErrors(schema.safeParse({ ...stay, guests: 3 })).guests).toMatch(/tối đa 2 khách mỗi phòng/);
    expect(schema.safeParse({ ...stay, guests: 3, rooms: 2 }).success).toBe(true);
  });

  it("ngày: thiếu, đã qua, trả trước nhận", () => {
    expect(fieldErrors(schema.safeParse({ ...stay, checkIn: "", checkOut: "" }))).toMatchObject({
      checkIn: "Vui lòng chọn ngày nhận phòng.",
      checkOut: "Vui lòng chọn ngày trả phòng.",
    });
    expect(fieldErrors(schema.safeParse({ ...stay, checkIn: "2026-12-31" })).checkIn).toBe(
      "Ngày nhận phòng không được ở quá khứ.",
    );
    expect(fieldErrors(schema.safeParse({ ...stay, checkOut: "2027-01-10" })).checkOut).toBe(
      "Ngày trả phòng phải sau ngày nhận phòng.",
    );
  });
});

describe("form thông tin + yêu cầu Server Action", () => {
  const details = {
    contact: { fullName: "Nguyễn Minh Anh", email: "test@gmail.com", phone: "0901 234 567" },
    guestName: "Nguyễn Minh Anh",
    note: "",
  };

  it("form: bắt buộc người nhận phòng", () => {
    expect(hotelBookingFormSchema.safeParse(details).success).toBe(true);
    expect(fieldErrors(hotelBookingFormSchema.safeParse({ ...details, guestName: " " })).guestName).toBe(
      "Vui lòng nhập họ tên người nhận phòng.",
    );
  });

  it("yêu cầu: kiểm cả lựa chọn lưu trú; không có trường giá nào được nhận", () => {
    const schema = createHotelBookingRequestSchema(roomTypes, TODAY);
    const parsed = schema.safeParse({ ...details, ...stay, hotelSlug: "ks-a", totalAmount: 1 });
    expect(parsed.success).toBe(true);
    expect(parsed.data).not.toHaveProperty("totalAmount");
    expect(schema.safeParse({ ...details, ...stay, guests: 5, hotelSlug: "ks-a" }).success).toBe(false);
  });
});
