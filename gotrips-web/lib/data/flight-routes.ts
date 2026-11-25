/**
 * Lớp truy cập dữ liệu chặng bay cho section "Chặng bay phổ biến" ở Trang chủ và trang `/flights`.
 * Cùng quy ước với `lib/data/home.ts`: component CHỈ import từ `lib/data/*`; khi nối API thật chỉ đổi thân hàm,
 * giữ nguyên chữ ký và các directive cache. Logic ghép sân bay nằm ở `flight-route-view.ts` (hàm thuần có test).
 */
import { cacheLife, cacheTag } from "next/cache";
import { listPopularFlightRoutes } from "@/lib/api/generated";
import { airports } from "@/lib/mock/airports";
import { flightRoutes } from "@/lib/mock/flight-routes";
import type { FlightRouteCardView } from "@/lib/types";
import { catalogRequestInit } from "./catalog-request";
import { selectPopularFlightRoutes } from "./flight-route-view";

/**
 * Chặng bay phổ biến cho Trang chủ — lấy từ gotrips-api (theo độ phổ biến, kèm sân bay hai đầu). Hàm không bắt lỗi;
 * gọi sau `await io()` (xem `loadSection`). `getFlightRoutes` bên dưới (trang `/flights`) vẫn là mock.
 */
export async function getPopularFlightRoutes(limit = 6): Promise<FlightRouteCardView[]> {
  "use cache";
  cacheLife("hours");
  // Thẻ hiện tên sân bay/thành phố lấy từ bảng sân bay nên cũng gắn tag "airports". API trả sẵn sân bay hai đầu trong
  // cùng một response (không gọi `getAirports()` lồng bên trong một hàm `"use cache"` khác) để chỉ có một tầng cache.
  cacheTag("flight-routes", "airports");

  const { data } = await listPopularFlightRoutes({ limit }, catalogRequestInit());
  return data;
}

/** Mọi chặng bay hiển thị được, cho trang `/flights` (vẫn là mock). Cùng quy tắc lọc/thứ tự với `getPopularFlightRoutes`. */
export async function getFlightRoutes(): Promise<FlightRouteCardView[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("flight-routes", "airports");

  return selectPopularFlightRoutes(flightRoutes, airports, flightRoutes.length);
}
