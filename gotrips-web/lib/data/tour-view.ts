import type { TourDeparture } from "@/lib/types";

/**
 * Tiện ích còn lại cho phần web vẫn dùng dữ liệu mock (đặt tour). Các trường suy ra của thẻ/chi tiết tour (giá từ, ngày gần
 * nhất, số chỗ, giảm giá, "sắp hết chỗ"...) KHÔNG còn tính ở web: do gotrips-api tính (`TourCardCalculator`).
 */

/** Ngày hôm nay (`YYYY-MM-DD`) theo giờ Việt Nam — không phụ thuộc múi giờ máy chủ. */
export function getTodayInVietnam(now: Date = new Date()): string {
  // Locale "en-CA" cho ra đúng định dạng YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(now);
}

export function getSeatsLeft(departure: Pick<TourDeparture, "totalSeats" | "bookedSeats">): number {
  return Math.max(0, departure.totalSeats - departure.bookedSeats);
}
