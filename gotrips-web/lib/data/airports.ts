/**
 * Lớp truy cập dữ liệu sân bay cho ô tìm vé máy bay. Cùng quy ước với `lib/data/home.ts`: component chỉ import
 * từ `lib/data/*`; khi nối API thật chỉ đổi thân hàm, giữ nguyên chữ ký và các directive cache.
 */
import { cacheLife, cacheTag } from "next/cache";
import { airports } from "@/lib/mock/airports";
import type { Airport } from "@/lib/types";

export async function getAirports(): Promise<Airport[]> {
  "use cache";
  // Danh sách sân bay gần như không đổi nên cache theo ngày; khi cần cập nhật gọi `revalidateTag("airports")`.
  cacheLife("days");
  cacheTag("airports");

  return airports;
}
