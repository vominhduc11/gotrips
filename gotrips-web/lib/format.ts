const vndFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

/** 3290000 → "3.290.000 ₫" */
export function formatVND(amount: number): string {
  return vndFormatter.format(amount);
}

/**
 * "2027-01-09" → "09/01/2027".
 * Cố ý tách chuỗi thay vì `new Date()` để kết quả không phụ thuộc múi giờ máy chủ/trình duyệt.
 */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

/** 4.8 → "4,8" (dấu phẩy thập phân theo vi-VN) */
export function formatRating(rating: number): string {
  return rating.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** (3, 2) → "3N2Đ" */
export function formatDuration(days: number, nights: number): string {
  return `${days}N${nights}Đ`;
}

/**
 * Thời gian bay: 125 → "2 giờ 5 phút", 60 → "1 giờ", 45 → "45 phút". Viết đủ chữ (không "2g5p") để trình đọc màn
 * hình đọc tự nhiên. Số phút âm/NaN coi như 0; số lẻ làm tròn.
 */
export function formatFlightDuration(totalMinutes: number): string {
  const minutes = Number.isFinite(totalMinutes) ? Math.max(0, Math.round(totalMinutes)) : 0;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} phút`;
  return rest === 0 ? `${hours} giờ` : `${hours} giờ ${rest} phút`;
}

/**
 * Chuẩn hoá để so khớp tên điểm đến: bỏ dấu, bỏ phân biệt hoa/thường, gộp khoảng trắng.
 * "Đà  Lạt" / "da lat" / "da-lat" → "da lat"
 */
export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/[-_\s]+/g, " ")
    .trim();
}
