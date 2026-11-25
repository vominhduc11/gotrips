/**
 * Lớp truy cập dữ liệu chuyến bay cho kết quả tìm vé (`/flights?…`) và trang đặt vé. Cùng quy ước với `home.ts`:
 * component CHỈ import từ `lib/data/*`; khi nối API thật chỉ đổi thân hàm, giữ nguyên chữ ký và các directive cache.
 * Logic giá/giờ bay nằm ở `flight-view.ts` (hàm thuần có test).
 */
import { cacheLife, cacheTag } from "next/cache";
import { airports } from "@/lib/mock/airports";
import { airlines, flightSchedules } from "@/lib/mock/flights";
import type { CabinClassValue, FlightOptionView } from "@/lib/types";
import { findFlightOption, findFlightOptions } from "./flight-view";

/** Các chuyến bay `from → to` ngày `date` ở hạng `cabin`, sắp theo giờ cất cánh. */
export async function searchFlights(query: {
  from: string;
  to: string;
  date: string;
  cabin: CabinClassValue;
}): Promise<FlightOptionView[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("flights", "airports");

  return findFlightOptions(flightSchedules, airlines, airports, query);
}

/** Một chuyến bay theo id lịch bay, chỉ khi đúng chiều `from → to`; không có → `null`. */
export async function getFlightOption(query: {
  scheduleId: number;
  from: string;
  to: string;
  date: string;
  cabin: CabinClassValue;
}): Promise<FlightOptionView | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("flights", "airports");

  return findFlightOption(flightSchedules, airlines, airports, query);
}
