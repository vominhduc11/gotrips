import { describe, expect, it } from "vitest";
import type { HotelRoomTypeView } from "@/lib/types";
import {
  changeHotelGuests,
  changeHotelRoom,
  getMaxStayGuests,
  getRoomCountRange,
  normalizeHotelStay,
  resolveHotelStay,
} from "./hotel-stay";

const TODAY = "2027-01-01";

const room = (id: number, pricePerNight: number, maxGuests: number): HotelRoomTypeView => ({
  id,
  name: `Phòng ${id}`,
  pricePerNight,
  maxGuests,
  bedType: "1 giường đôi",
  areaM2: 25,
});
// Cố ý không theo thứ tự giá để kiểm "rẻ nhất".
const rooms = [room(2, 1_980_000, 4), room(1, 1_250_000, 2)];
const stay = { roomTypeId: 1, checkIn: "2027-01-10", checkOut: "2027-01-12", guests: 2, rooms: 1 };
const params = { room: 1, checkIn: "2027-01-10", checkOut: "2027-01-12", guests: 2, rooms: 1 };

describe("resolveHotelStay", () => {
  it("theo URL khi phòng trên URL thuộc khách sạn", () => {
    expect(resolveHotelStay({ ...params, room: 2 }, rooms)).toEqual({ ...stay, roomTypeId: 2 });
  });

  it("phòng lạ / không có → phòng rẻ nhất đủ chỗ, không nữa thì phòng rẻ nhất", () => {
    expect(resolveHotelStay({ ...params, room: 99 }, rooms).roomTypeId).toBe(1);
    expect(resolveHotelStay({ ...params, room: undefined, guests: 3 }, rooms).roomTypeId).toBe(2);
    expect(resolveHotelStay({ ...params, room: undefined, guests: 9 }, rooms).roomTypeId).toBe(1);
  });

  it("thiếu ngày → ô ngày trống; số phòng không quá số khách", () => {
    expect(resolveHotelStay({ ...params, checkIn: undefined, checkOut: undefined }, rooms)).toMatchObject({
      checkIn: "",
      checkOut: "",
    });
    expect(resolveHotelStay({ ...params, guests: 1, rooms: 3 }, rooms).rooms).toBe(1);
  });
});

describe("normalizeHotelStay", () => {
  it("lựa chọn đặt được → trả lại đúng giá trị", () => {
    expect(normalizeHotelStay(params, rooms, TODAY)).toEqual(stay);
  });

  it("không đặt được → null: thiếu ngày, ngày đã qua, phòng lạ, vượt sức chứa", () => {
    expect(normalizeHotelStay({ ...params, checkIn: undefined }, rooms, TODAY)).toBeNull();
    expect(normalizeHotelStay(params, rooms, "2027-01-11")).toBeNull();
    expect(normalizeHotelStay({ ...params, room: 99 }, rooms, TODAY)).toBeNull();
    expect(normalizeHotelStay({ ...params, guests: 3 }, rooms, TODAY)).toBeNull();
  });
});

describe("changeHotelRoom", () => {
  it("đổi phòng, giữ số phòng nếu vẫn đủ chỗ", () => {
    expect(changeHotelRoom(stay, 2, rooms)).toEqual({ ...stay, roomTypeId: 2 });
  });

  it("phòng nhỏ hơn mà không đủ chỗ → tự tăng số phòng vừa đủ", () => {
    expect(changeHotelRoom({ ...stay, roomTypeId: 2, guests: 4 }, 1, rooms)).toMatchObject({ roomTypeId: 1, rooms: 2 });
  });

  it("phòng không thuộc khách sạn → giữ nguyên", () => {
    expect(changeHotelRoom(stay, 99, rooms)).toBe(stay);
  });
});

describe("số khách / số phòng", () => {
  it("getRoomCountRange: ít nhất đủ chỗ, nhiều nhất bằng số khách (tối đa 10)", () => {
    expect(getRoomCountRange(5, 2)).toEqual({ min: 3, max: 5 });
    expect(getRoomCountRange(30, 4)).toEqual({ min: 8, max: 10 });
    expect(getRoomCountRange(1, 4)).toEqual({ min: 1, max: 1 });
  });

  it("getMaxStayGuests: sức chứa × 10 phòng, không quá giới hạn", () => {
    expect(getMaxStayGuests(2, 30)).toBe(20);
    expect(getMaxStayGuests(4, 30)).toBe(30);
  });

  it("changeHotelGuests tự đưa số phòng vào khoảng hợp lệ", () => {
    expect(changeHotelGuests(stay, 3, rooms).rooms).toBe(2); // phòng 2 khách → 3 khách cần 2 phòng
    expect(changeHotelGuests({ ...stay, rooms: 3, guests: 3 }, 2, rooms).rooms).toBe(2); // phòng không nhiều hơn khách
    expect(changeHotelGuests(stay, 1, rooms)).toEqual({ ...stay, guests: 1, rooms: 1 });
  });
});
