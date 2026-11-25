import { z } from "zod";

/** Các kiểu sắp xếp của trang /tours. Phần tử đầu là mặc định (không ghi vào URL). */
export const TOUR_SORT_OPTIONS = [
  { value: "noi-bat", label: "Nổi bật" },
  { value: "ngay-gan", label: "Ngày khởi hành gần nhất" },
  { value: "gia-tang", label: "Giá thấp đến cao" },
  { value: "gia-giam", label: "Giá cao đến thấp" },
  { value: "danh-gia", label: "Đánh giá cao nhất" },
] as const;

export type TourSort = (typeof TOUR_SORT_OPTIONS)[number]["value"];
export const DEFAULT_TOUR_SORT: TourSort = "noi-bat";

/** URL có thể lặp tham số (`?a=1&a=2`) → lấy giá trị đầu tiên. */
const first = (value: unknown) => (Array.isArray(value) ? value[0] : value);

/**
 * Bộ lọc của trang /tours, đọc từ URL search params (nguồn sự thật duy nhất, xem CLAUDE.md).
 * Giá trị rác trên URL không làm trang lỗi: tham số sai bị bỏ qua (`catch`), sort/page về mặc định.
 *  - `destination`: slug điểm đến (từ thẻ "Điểm đến phổ biến" hoặc form tìm kiếm).
 *  - `q`          : chữ tự do khi không khớp điểm đến nào; giới hạn độ dài vì làm khoá cache.
 *  - `date`       : ngày khởi hành `YYYY-MM-DD` (kiểu DATE, không múi giờ).
 *  - `guests`     : số khách, chuyến phải còn đủ chỗ.
 */
export const tourFiltersSchema = z.object({
  destination: z.preprocess(first, z.string().trim().min(1).max(60).optional().catch(undefined)),
  q: z.preprocess(first, z.string().trim().min(1).max(100).optional().catch(undefined)),
  date: z.preprocess(first, z.iso.date().optional().catch(undefined)),
  guests: z.preprocess(first, z.coerce.number().int().min(1).max(50).optional().catch(undefined)),
  sort: z.preprocess(first, z.enum(TOUR_SORT_OPTIONS.map((o) => o.value) as [TourSort, ...TourSort[]]).catch(DEFAULT_TOUR_SORT)),
  // Trần 10.000: số trang vượt xa thực tế là rác (về trang 1) và API chỉ nhận số nguyên 32 bit; trang lớn nhưng còn
  // trong trần thì API kẹp về trang cuối.
  page: z.preprocess(first, z.coerce.number().int().min(1).max(10_000).catch(1)),
});

export type TourFilters = z.infer<typeof tourFiltersSchema>;

/** `searchParams` của Next (`Promise` đã `await`) → bộ lọc hợp lệ. */
export function parseTourFilters(raw: Record<string, string | string[] | undefined>): TourFilters {
  return tourFiltersSchema.parse(raw);
}

/**
 * Dựng URL `/tours?...` từ bộ lọc (kèm thay đổi `patch`). Tham số trống/mặc định bị bỏ để URL gọn.
 * Mỗi khi đổi bộ lọc (không phải đổi trang) thì về trang 1: truyền `page: 1` thông qua `patch` mặc định bên dưới.
 */
export function buildTourListHref(filters: TourFilters, patch: Partial<TourFilters> = {}): string {
  const next = { ...filters, ...patch };
  // Đổi bộ lọc/sắp xếp mà không nói rõ trang → quay về trang 1 (trang cũ có thể không còn tồn tại).
  if (!("page" in patch)) next.page = 1;

  const params = new URLSearchParams();
  if (next.destination) params.set("destination", next.destination);
  if (next.q) params.set("q", next.q);
  if (next.date) params.set("date", next.date);
  if (next.guests) params.set("guests", String(next.guests));
  if (next.sort !== DEFAULT_TOUR_SORT) params.set("sort", next.sort);
  if (next.page > 1) params.set("page", String(next.page));

  const query = params.toString();
  return query ? `/tours?${query}` : "/tours";
}
