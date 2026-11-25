import { diffInDays } from "@/lib/iso-date";
import type { HotelRoomTypeView } from "@/lib/types";

/**
 * Các hàm nhỏ phục vụ GIAO DIỆN đặt phòng: tạm tính tiền ngay khi khách đổi ngày/số phòng và tự khớp số phòng với sức
 * chứa (thẻ "Đặt phòng", trang đặt phòng, `lib/booking/hotel-stay.ts`). Việc tìm khách sạn, chọn phòng rẻ nhất đủ chỗ,
 * tổng tiền cả kỳ và thứ tự kết quả do gotrips-api tính (`HotelStayCalculator`); đừng thêm luật tìm kiếm vào đây.
 *
 * Phần dành cho server (`computeStayTotal` ở `createHotelBookingAction`) còn lại tới khi đơn được tạo ở API, lúc đó giá
 * do API tính và chỉ phần tạm tính hiển thị còn dùng file này.
 */

/** Số đêm lưu trú = số ngày lịch giữa ngày nhận và ngày trả (`YYYY-MM-DD`, đã hợp lệ). */
export function countNights(checkIn: string, checkOut: string): number {
  return diffInDays(checkOut, checkIn);
}

/**
 * Tiền phòng = giá một phòng một đêm × số đêm × số phòng. Một chỗ tính duy nhất cho thẻ "Đặt phòng", trang đặt phòng
 * và Server Action (server tính lại, không tin số ở trình duyệt).
 */
export function computeStayTotal(pricePerNight: number, nights: number, rooms: number): number {
  return pricePerNight * nights * rooms;
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
