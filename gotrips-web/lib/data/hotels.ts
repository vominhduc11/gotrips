/**
 * Lớp truy cập dữ liệu khách sạn cho section "Khách sạn nổi bật" ở Trang chủ. Cùng quy ước với `lib/data/home.ts`:
 * component CHỈ import từ `lib/data/*`; khi nối API thật chỉ đổi thân hàm (fetch + map sang `HotelCardView`),
 * giữ nguyên chữ ký và các directive cache. Logic chọn/ghép nằm ở `hotel-view.ts` (hàm thuần có test).
 */
import { cacheLife, cacheTag } from "next/cache";
import { destinations } from "@/lib/mock/destinations";
import { hotelRoomTypes } from "@/lib/mock/hotel-room-types";
import { hotels } from "@/lib/mock/hotels";
import type { HotelCardView } from "@/lib/types";
import { selectFeaturedHotels } from "./hotel-view";

export async function getFeaturedHotels(limit = 4): Promise<HotelCardView[]> {
  "use cache";
  cacheLife("hours");
  // `destinations` vì thẻ hiện tên điểm đến: đổi tên điểm đến thì danh sách này phải được làm mới theo.
  cacheTag("hotels", "destinations");

  return selectFeaturedHotels(hotels, hotelRoomTypes, destinations, limit);
}
