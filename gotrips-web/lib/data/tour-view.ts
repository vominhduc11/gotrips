/**
 * Tiện ích ngày dùng chung. Các trường suy ra của thẻ/chi tiết tour (giá từ, ngày gần nhất, số chỗ, giảm giá, "sắp hết
 * chỗ"...) do gotrips-api tính (`TourCardCalculator`), không tính ở web.
 */

/** Ngày hôm nay (`YYYY-MM-DD`) theo giờ Việt Nam — không phụ thuộc múi giờ máy chủ. */
export function getTodayInVietnam(now: Date = new Date()): string {
  // Locale "en-CA" cho ra đúng định dạng YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(now);
}
