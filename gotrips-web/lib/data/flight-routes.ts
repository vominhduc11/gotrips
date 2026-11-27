/**
 * Lớp truy cập dữ liệu chặng bay cho section "Chặng bay phổ biến" ở Trang chủ và trang `/flights`.
 * Cùng quy ước với `lib/data/home.ts`: component CHỈ import từ `lib/data/*`; hàm không bắt lỗi, gọi sau `await io()`
 * (xem `loadSection`).
 */
import { cacheLife, cacheTag } from "next/cache";
import { listPopularFlightRoutes } from "@/lib/api/generated";
import type { FlightRouteCardView } from "@/lib/types";
import { catalogRequestInit } from "./catalog-request";

/** Giới hạn `limit` của API; trang `/flights` hiện mọi chặng (seed có 6, còn xa mức này). */
const ALL_ROUTES_LIMIT = 50;

async function fetchRoutes(limit: number): Promise<FlightRouteCardView[]> {
  // API trả theo độ phổ biến, kèm sân bay hai đầu trong cùng một response (không gọi `getAirports()` lồng bên trong một
  // hàm `"use cache"` khác) nên chỉ có một tầng cache.
  const { data } = await listPopularFlightRoutes({ limit }, catalogRequestInit());
  return data;
}

/** Chặng bay phổ biến cho Trang chủ. */
export async function getPopularFlightRoutes(limit = 6): Promise<FlightRouteCardView[]> {
  "use cache";
  cacheLife("hours");
  // Thẻ hiện tên sân bay/thành phố lấy từ bảng sân bay nên cũng gắn tag "airports".
  cacheTag("flight-routes", "airports");

  return fetchRoutes(limit);
}

/** Mọi chặng bay, cho phần gợi ý của trang `/flights`. */
export async function getFlightRoutes(): Promise<FlightRouteCardView[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("flight-routes", "airports");

  return fetchRoutes(ALL_ROUTES_LIMIT);
}
