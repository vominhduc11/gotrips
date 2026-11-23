import type { Airport, FlightRoute, FlightRouteCardView } from "@/lib/types";

/**
 * Logic thuần của section "Chặng bay phổ biến" (không đụng cache/mock nên kiểm thử được bằng Vitest).
 * `lib/data/flight-routes.ts` chỉ lo lấy dữ liệu + cache rồi gọi vào đây.
 */

/**
 * Ghép chặng bay với thông tin sân bay hai đầu. Trả `null` khi một đầu không có trong danh sách sân bay hoặc
 * hai đầu trùng nhau: thẻ sẽ điền sẵn ô "Điểm đi/Điểm đến", mà form chỉ nhận mã có trong danh sách sân bay và
 * từ chối điểm đi = điểm đến — nên chặng như vậy không được hiện.
 */
export function toFlightRouteCardView(route: FlightRoute, airports: Airport[]): FlightRouteCardView | null {
  if (route.fromCode === route.toCode) return null;
  const from = airports.find((airport) => airport.code === route.fromCode);
  const to = airports.find((airport) => airport.code === route.toCode);
  if (!from || !to) return null;

  return {
    id: route.id,
    from,
    to,
    durationMinutes: route.durationMinutes,
    referencePrice: route.referencePrice,
    imageUrl: route.imageUrl,
    imageAlt: route.imageAlt,
  };
}

/** Chặng bay hiện ở Trang chủ, tối đa `limit`, giữ nguyên thứ tự đầu vào (dữ liệu đã sắp theo độ phổ biến). */
export function selectPopularFlightRoutes(
  routes: FlightRoute[],
  airports: Airport[],
  limit: number,
): FlightRouteCardView[] {
  return routes
    .flatMap((route) => {
      const view = toFlightRouteCardView(route, airports);
      return view ? [view] : [];
    })
    .slice(0, Math.max(0, limit));
}
