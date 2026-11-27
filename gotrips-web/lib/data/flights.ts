/**
 * Lớp truy cập dữ liệu chuyến bay cho kết quả tìm vé (`/flights?…`), trang đặt vé và Server Action đặt vé. Cùng quy ước
 * với `lib/data/tours.ts`: component CHỈ import từ đây; gọi gotrips-api qua client do Orval sinh.
 *
 *  - Giá theo hạng ghế, giờ hạ cánh, ghế còn lại, `isBookable` và thứ tự kết quả do API tính.
 *  - Số ghế đổi mỗi khi có người đặt nên chỉ cache ngắn (`cacheLife("minutes")`); đơn của chính web này còn làm mới tag
 *    "flights" ngay sau khi đặt. Chốt chặn bán quá số ghế là API (409), không phải cache.
 *  - Hàm KHÔNG bắt lỗi (trừ 404 là kết quả hợp lệ): nơi gọi dùng `loadSection`.
 */
import { cacheLife, cacheTag } from "next/cache";
import { getFlight, searchFlights as searchFlightsApi } from "@/lib/api/generated";
import { ApiError } from "@/lib/api/http";
import type { FlightOptionView } from "@/lib/types";
import { catalogRequestInit } from "./catalog-request";
import { isValidScheduleId, toFlightOptionView, toSearchFlightsParams, type FlightQuery } from "./flight-request";

/** Các chuyến bay `from → to` ngày `date` ở hạng `cabin`, sắp theo giờ cất cánh. */
export async function searchFlights(query: FlightQuery): Promise<FlightOptionView[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("flights", "airports");

  const { data } = await searchFlightsApi(toSearchFlightsParams(query), catalogRequestInit());
  return data.map(toFlightOptionView);
}

async function fetchFlight(
  scheduleId: number,
  query: FlightQuery,
  init: RequestInit,
): Promise<FlightOptionView | null> {
  if (!isValidScheduleId(scheduleId)) return null;
  try {
    const { data } = await getFlight(scheduleId, toSearchFlightsParams(query), init);
    return toFlightOptionView(data);
  } catch (error) {
    // 404: id không có hoặc không đúng chiều from → to (id do URL mang tới).
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** Một chuyến bay theo id lịch bay, chỉ khi đúng chiều `from → to`; không có → `null`. Để hiển thị. */
export async function getFlightOption(scheduleId: number, query: FlightQuery): Promise<FlightOptionView | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("flights", "airports");

  return fetchFlight(scheduleId, query, catalogRequestInit());
}

/** Như `getFlightOption` nhưng đọc thẳng API (không cache): kiểm "còn đặt được" lúc khách bấm đặt. */
export async function getFlightForBooking(scheduleId: number, query: FlightQuery): Promise<FlightOptionView | null> {
  return fetchFlight(scheduleId, query, { ...catalogRequestInit(), cache: "no-store" });
}
