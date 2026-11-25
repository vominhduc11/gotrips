import { z } from "zod";

/** Số khách tối đa chọn được ở ô "Số khách" (trang /tours chấp nhận tới 50, xem `tour-filters.ts`). */
export const TOUR_MAX_GUESTS = 20;

const GUESTS_MESSAGE = `Số khách phải từ 1 đến ${TOUR_MAX_GUESTS}.`;

/**
 * Form tìm tour ở Trang chủ. Dùng chung cho client (React Hook Form) và Server Action sau này.
 * - `destination`: slug điểm đến chọn từ combobox, hoặc trống (= mọi điểm đến). Không còn ô gõ tự do nên
 *   không có `q`; muốn tìm theo chữ thì dùng ô tìm kiếm ở trang /tours.
 * - `date` : ngày khởi hành `YYYY-MM-DD` (kiểu DATE, không múi giờ) hoặc trống.
 * - `guests`: số nguyên từ 1 tới `TOUR_MAX_GUESTS`.
 */
export const searchSchema = z.object({
  destination: z.string().trim(),
  date: z.union([z.literal(""), z.iso.date("Ngày khởi hành chưa đúng định dạng.")]),
  guests: z.number({ error: GUESTS_MESSAGE }).int(GUESTS_MESSAGE).min(1, GUESTS_MESSAGE).max(TOUR_MAX_GUESTS, GUESTS_MESSAGE),
});

export type SearchFormValues = z.infer<typeof searchSchema>;
