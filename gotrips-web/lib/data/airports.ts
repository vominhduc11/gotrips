/**
 * Lớp truy cập dữ liệu sân bay cho ô tìm vé máy bay (lấy từ gotrips-api). Cùng quy ước với `lib/data/home.ts`: component
 * chỉ import từ `lib/data/*`, hàm không bắt lỗi (API lỗi thì ném, không cache), gọi sau `await io()` (xem `loadSection`).
 */
import { cacheLife, cacheTag } from "next/cache";
import { listAirports } from "@/lib/api/generated";
import type { Airport } from "@/lib/types";
import { catalogRequestInit } from "./catalog-request";

export async function getAirports(): Promise<Airport[]> {
  "use cache";
  // Danh sách sân bay gần như không đổi nên cache theo ngày; khi cần cập nhật gọi `revalidateTag("airports")`.
  cacheLife("days");
  cacheTag("airports");

  // API trả theo thứ tự gợi ý (các đầu mối lớn trước).
  const { data } = await listAirports(catalogRequestInit());
  return data;
}
