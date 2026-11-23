/**
 * Lớp truy cập dữ liệu chặng bay cho section "Chặng bay phổ biến" ở Trang chủ. Cùng quy ước với `lib/data/home.ts`:
 * component CHỈ import từ `lib/data/*`; khi nối API thật chỉ đổi thân hàm, giữ nguyên chữ ký và các directive cache.
 * Logic ghép sân bay nằm ở `flight-route-view.ts` (hàm thuần có test).
 */
import { cacheLife, cacheTag } from "next/cache";
import { airports } from "@/lib/mock/airports";
import { flightRoutes } from "@/lib/mock/flight-routes";
import type { FlightRouteCardView } from "@/lib/types";
import { selectPopularFlightRoutes } from "./flight-route-view";

export async function getPopularFlightRoutes(limit = 6): Promise<FlightRouteCardView[]> {
  "use cache";
  cacheLife("hours");
  // Thẻ hiện tên sân bay/thành phố lấy từ bảng sân bay nên cũng gắn tag "airports". Đọc thẳng bảng sân bay ở đây
  // (không gọi `getAirports()` lồng bên trong một hàm `"use cache"` khác) để chỉ có một tầng cache, khỏi lệch hạn.
  cacheTag("flight-routes", "airports");

  return selectPopularFlightRoutes(flightRoutes, airports, limit);
}
