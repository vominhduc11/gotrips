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
