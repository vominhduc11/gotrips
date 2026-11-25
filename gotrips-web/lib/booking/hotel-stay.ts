import { findCheapestFittingRoom, sortRoomTypes } from "@/lib/data/hotel-view";
import { createHotelStaySchema, type HotelStaySelection, type HotelStayValues } from "@/lib/schemas/hotel-booking";
import { HOTEL_MAX_ROOMS } from "@/lib/schemas/hotel-search";
import type { HotelRoomType } from "@/lib/types";

/**
 * Luật của lựa chọn lưu trú (loại phòng, ngày, số khách, số phòng) — hàm thuần, có test. Dùng chung cho thẻ "Đặt phòng"
 * ở trang chi tiết, nút "Chọn phòng này" ở danh sách phòng và trang đặt phòng.
 */

/**
 * Giá trị ban đầu của thẻ "Đặt phòng": theo URL (khách đến từ kết quả tìm kiếm, hoặc quay lại từ trang đặt phòng).
 * Loại phòng: phòng trên URL nếu thuộc khách sạn này, không thì phòng rẻ nhất chứa đủ khách, không nữa thì phòng rẻ
 * nhất. Ngày lấy nguyên từ URL (đã đúng định dạng); có còn hợp lệ không (đã qua ngày...) thì form báo khi bấm "Đặt phòng".
 */
export function resolveHotelStay(params: HotelStaySelection, roomTypes: HotelRoomType[]): HotelStayValues {
  const fromUrl = roomTypes.find((room) => room.id === params.room);
  const room =
    fromUrl ?? findCheapestFittingRoom(roomTypes, params.guests, params.rooms) ?? sortRoomTypes(roomTypes)[0];
  return {
    roomTypeId: room?.id ?? 0,
    checkIn: params.checkIn ?? "",
    checkOut: params.checkOut ?? "",
    guests: params.guests,
    rooms: Math.min(params.rooms, params.guests),
  };
}

/**
 * Lựa chọn lưu trú trên URL của trang đặt phòng, nếu đặt được; không thì `null` (trang đưa khách về thẻ "Đặt phòng"
 * để chọn lại). Cùng schema với form ở trang chi tiết, nên hai nơi không lệch luật.
 */
export function normalizeHotelStay(
  params: HotelStaySelection,
  roomTypes: HotelRoomType[],
  today?: string,
): HotelStayValues | null {
  const parsed = createHotelStaySchema(roomTypes, today).safeParse({
    roomTypeId: params.room ?? 0,
    checkIn: params.checkIn ?? "",
    checkOut: params.checkOut ?? "",
    guests: params.guests,
    rooms: params.rooms,
  });
  return parsed.success ? parsed.data : null;
}

/**
 * Đổi sang loại phòng `roomTypeId`. Nếu số khách vượt sức chứa với số phòng hiện tại thì tự TĂNG số phòng vừa đủ
 * (không quá giới hạn và không quá số khách) — khách bấm "Chọn phòng này" là muốn ở phòng đó, không nên nhận ngay lỗi.
 * Phòng không thuộc khách sạn → giữ nguyên.
 */
export function changeHotelRoom(
  current: HotelStayValues,
  roomTypeId: number,
  roomTypes: HotelRoomType[],
): HotelStayValues {
  const room = roomTypes.find((r) => r.id === roomTypeId);
  if (!room) return current;
  const needed = Math.ceil(current.guests / room.maxGuests);
  const rooms = Math.min(Math.max(current.rooms, needed), HOTEL_MAX_ROOMS, current.guests);
  return { ...current, roomTypeId: room.id, rooms };
}

/** Số phòng ít nhất / nhiều nhất cho `guests` khách ở loại phòng chứa `maxGuests` khách mỗi phòng. */
export function getRoomCountRange(guests: number, maxGuests: number): { min: number; max: number } {
  const max = Math.max(1, Math.min(HOTEL_MAX_ROOMS, guests));
  return { min: Math.min(max, Math.max(1, Math.ceil(guests / Math.max(1, maxGuests)))), max };
}

/** Số khách tối đa đặt được với loại phòng này (đặt tối đa `HOTEL_MAX_ROOMS` phòng). */
export function getMaxStayGuests(maxGuestsPerRoom: number, limit: number): number {
  return Math.max(1, Math.min(limit, maxGuestsPerRoom * HOTEL_MAX_ROOMS));
}

/**
 * Đổi số khách: số phòng tự nằm trong khoảng hợp lệ (đủ chỗ cho số khách mới, không nhiều hơn số khách). Nhờ vậy nút
 * −/+ không bao giờ tạo ra tổ hợp phòng/khách vô lý; schema vẫn kiểm lại lúc submit.
 */
export function changeHotelGuests(
  current: HotelStayValues,
  guests: number,
  roomTypes: HotelRoomType[],
): HotelStayValues {
  const room = roomTypes.find((r) => r.id === current.roomTypeId);
  const range = getRoomCountRange(guests, room?.maxGuests ?? guests);
  return { ...current, guests, rooms: Math.min(Math.max(current.rooms, range.min), range.max) };
}
