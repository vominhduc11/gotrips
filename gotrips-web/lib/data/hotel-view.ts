import { diffInDays } from "@/lib/iso-date";
import type { HotelRoomTypeView } from "@/lib/types";

/**
 * Các hàm nhỏ phục vụ GIAO DIỆN đặt phòng: tạm tính tiền ngay khi khách đổi ngày/số phòng và tự khớp số phòng với sức
 * chứa (thẻ "Đặt phòng", trang đặt phòng, `lib/booking/hotel-stay.ts`). Việc tìm khách sạn, chọn phòng rẻ nhất còn
 * trống đủ chỗ, tổng tiền cả kỳ, phòng trống và giá của đơn do gotrips-api tính (`HotelStayCalculator`); đừng thêm luật
 * tìm kiếm hay đặt phòng vào đây.
 */

/** Số đêm lưu trú = số ngày lịch giữa ngày nhận và ngày trả (`YYYY-MM-DD`, đã hợp lệ). */
export function countNights(checkIn: string, checkOut: string): number {
  return diffInDays(checkOut, checkIn);
}

/**
 * Tạm tính tiền phòng = giá một phòng một đêm × số đêm × số phòng (thẻ "Đặt phòng", trang đặt phòng). Tiền thật do API
 * tính lúc tạo đơn.
 */
export function computeStayTotal(pricePerNight: number, nights: number, rooms: number): number {
  return pricePerNight * nights * rooms;
}

/**
 * Chỉ giữ các trường của loại phòng gốc trước khi gửi sang Client Component (thẻ "Đặt phòng", form đặt phòng): ảnh và
 * tiện ích chỉ phần server cần, gửi kèm làm payload RSC phình. Liệt kê từng trường, KHÔNG rải `...rest`: TypeScript coi
 * bản chi tiết là hợp lệ ở chỗ nhận bản gốc nên không bắt được chỗ quên lược, và rải sẽ để lọt trường mới.
 */
export function toRoomTypeView({
  id,
  name,
  pricePerNight,
  maxGuests,
  bedType,
  areaM2,
}: HotelRoomTypeView): HotelRoomTypeView {
  return { id, name, pricePerNight, maxGuests, bedType, areaM2 };
}

/** Loại phòng chứa đủ số khách khi đặt `rooms` phòng: mỗi phòng ít nhất 1 khách, nhiều nhất `maxGuests`. */
export function roomFitsGuests(room: Pick<HotelRoomTypeView, "maxGuests">, guests: number, rooms: number): boolean {
  return rooms >= 1 && rooms <= guests && guests <= room.maxGuests * rooms;
}

/** Loại phòng sắp theo giá tăng dần, rồi `id` (thứ tự luôn cố định). Không sửa mảng đầu vào. */
export function sortRoomTypes(roomTypes: HotelRoomTypeView[]): HotelRoomTypeView[] {
  return [...roomTypes].sort((a, b) => a.pricePerNight - b.pricePerNight || a.id - b.id);
}

/** Phòng rẻ nhất chứa đủ khách; không phòng nào chứa đủ → `undefined`. */
export function findCheapestFittingRoom(
  roomTypes: HotelRoomTypeView[],
  guests: number,
  rooms: number,
): HotelRoomTypeView | undefined {
  return sortRoomTypes(roomTypes).find((room) => roomFitsGuests(room, guests, rooms));
}
