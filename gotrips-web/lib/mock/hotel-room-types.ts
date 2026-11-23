import type { HotelRoomType } from "@/lib/types";

/**
 * Bảng `hotel_room_types` — dữ liệu THỬ NGHIỆM. `hotelId` trỏ tới `hotels.ts`.
 * "Giá từ" của khách sạn KHÔNG lưu ở đây: được tính (giá thấp nhất) trong `lib/data/hotel-view.ts`.
 * Giá một đêm, VND; số ở đây là số minh hoạ, không phải giá bán.
 */
export const hotelRoomTypes: HotelRoomType[] = [
  // 1 — Khách sạn Đồi Mây (Đà Lạt)
  { id: 1, hotelId: 1, name: "Phòng Deluxe", pricePerNight: 1250000, maxGuests: 2 },
  { id: 2, hotelId: 1, name: "Phòng Gia đình", pricePerNight: 1980000, maxGuests: 4 },
  // 2 — Villa Thông Xanh (Đà Lạt)
  { id: 3, hotelId: 2, name: "Phòng Standard", pricePerNight: 690000, maxGuests: 2 },
  { id: 4, hotelId: 2, name: "Phòng Hướng đồi", pricePerNight: 850000, maxGuests: 3 },
  // 3 — Resort Bãi Sao (Phú Quốc)
  { id: 5, hotelId: 3, name: "Phòng Hướng vườn", pricePerNight: 3200000, maxGuests: 2 },
  { id: 6, hotelId: 3, name: "Phòng Hướng biển", pricePerNight: 4100000, maxGuests: 3 },
  { id: 7, hotelId: 3, name: "Biệt thự hồ bơi riêng", pricePerNight: 7800000, maxGuests: 6 },
  // 4 — Khách sạn Hoàng Hôn (Phú Quốc)
  { id: 8, hotelId: 4, name: "Phòng Superior", pricePerNight: 1450000, maxGuests: 2 },
  { id: 9, hotelId: 4, name: "Phòng Deluxe có ban công", pricePerNight: 1850000, maxGuests: 3 },
  // 5 — Khách sạn Vịnh Xanh (Hạ Long)
  { id: 10, hotelId: 5, name: "Phòng Superior", pricePerNight: 1100000, maxGuests: 2 },
  { id: 11, hotelId: 5, name: "Phòng Hướng vịnh", pricePerNight: 1650000, maxGuests: 3 },
  // 6 — Khách sạn Mây Ngàn (Sapa)
  { id: 12, hotelId: 6, name: "Phòng Standard", pricePerNight: 780000, maxGuests: 2 },
  { id: 13, hotelId: 6, name: "Phòng Hướng thung lũng", pricePerNight: 1050000, maxGuests: 3 },
  // 7 — Khách sạn Phố Hoa Đăng (Hội An)
  { id: 14, hotelId: 7, name: "Phòng Deluxe", pricePerNight: 1350000, maxGuests: 2 },
  { id: 15, hotelId: 7, name: "Phòng Gia đình", pricePerNight: 2100000, maxGuests: 4 },
  // 8 — Resort Biển Xanh (Nha Trang, đang ẩn)
  { id: 16, hotelId: 8, name: "Phòng Hướng biển", pricePerNight: 3600000, maxGuests: 3 },
  { id: 17, hotelId: 8, name: "Suite Biển", pricePerNight: 6200000, maxGuests: 4 },
];
