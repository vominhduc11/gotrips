import { z } from "zod";

const GUESTS_MESSAGE = "Vui lòng nhập số khách từ 1 trở lên.";

/**
 * Form tìm tour ở Trang chủ. Dùng chung cho client (React Hook Form) và Server Action sau này.
 * - `q`    : chữ người dùng nhập ở ô điểm đến (có thể trống).
 * - `date` : ngày khởi hành `YYYY-MM-DD` (kiểu DATE, không múi giờ) hoặc trống.
 * - `guests`: số nguyên ≥ 1. Ô trống/không phải số (NaN) cũng báo cùng thông điệp.
 */
export const searchSchema = z.object({
  q: z.string().trim(),
  date: z.union([z.literal(""), z.iso.date("Ngày khởi hành chưa đúng định dạng.")]),
  guests: z.number({ error: GUESTS_MESSAGE }).int(GUESTS_MESSAGE).min(1, GUESTS_MESSAGE),
});

export type SearchFormValues = z.infer<typeof searchSchema>;
