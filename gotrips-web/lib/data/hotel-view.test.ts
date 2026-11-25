import { describe, expect, it } from "vitest";
import type { HotelRoomTypeView } from "@/lib/types";
import { computeStayTotal, countNights, findCheapestFittingRoom, roomFitsGuests, sortRoomTypes } from "./hotel-view";

// Luật tìm khách sạn (lọc ẩn/không phòng, phòng rẻ nhất đủ chỗ, sắp theo tổng tiền) đã chuyển sang gotrips-api và được
// kiểm ở `HotelStayCalculatorTests`; ở đây chỉ còn các hàm nhỏ phục vụ tạm tính trên giao diện.

function makeRoom(pricePerNight: number, id: number, maxGuests = 2): HotelRoomTypeView {
  return { id, name: `Phòng ${pricePerNight}`, pricePerNight, maxGuests, bedType: "1 giường đôi", areaM2: 25 };
}

describe("tiền phòng", () => {
  it("countNights = số ngày lịch giữa nhận và trả (qua tháng, qua năm)", () => {
    expect(countNights("2026-12-30", "2027-01-02")).toBe(3);
    expect(countNights("2027-02-28", "2027-03-01")).toBe(1);
  });

  it("computeStayTotal = giá một phòng một đêm × số đêm × số phòng", () => {
    expect(computeStayTotal(1_250_000, 3, 2)).toBe(7_500_000);
  });
});

describe("roomFitsGuests / findCheapestFittingRoom", () => {
  it("đủ chỗ khi khách ≤ sức chứa × số phòng, và mỗi phòng có ít nhất 1 khách", () => {
    expect(roomFitsGuests({ maxGuests: 2 }, 4, 2)).toBe(true);
    expect(roomFitsGuests({ maxGuests: 2 }, 5, 2)).toBe(false);
    expect(roomFitsGuests({ maxGuests: 4 }, 1, 2)).toBe(false);
    expect(roomFitsGuests({ maxGuests: 4 }, 1, 0)).toBe(false);
  });

  it("chọn phòng rẻ nhất trong các phòng đủ chỗ; không phòng nào đủ → undefined", () => {
    const rooms = [makeRoom(900_000, 1, 2), makeRoom(1_500_000, 2, 4), makeRoom(1_200_000, 3, 3)];
    expect(findCheapestFittingRoom(rooms, 2, 1)?.id).toBe(1);
    expect(findCheapestFittingRoom(rooms, 3, 1)?.id).toBe(3);
    expect(findCheapestFittingRoom(rooms, 4, 1)?.id).toBe(2);
    expect(findCheapestFittingRoom(rooms, 5, 1)).toBeUndefined();
  });
});

describe("sortRoomTypes", () => {
  it("sắp theo giá tăng dần, hoà giá thì theo id, và không sửa mảng đầu vào", () => {
    const rooms = [makeRoom(900_000, 3), makeRoom(500_000, 2), makeRoom(500_000, 1)];

    expect(sortRoomTypes(rooms).map((room) => room.id)).toEqual([1, 2, 3]);
    expect(rooms.map((room) => room.id)).toEqual([3, 2, 1]);
  });
});
