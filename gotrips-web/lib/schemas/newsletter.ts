import { z } from "zod";

// Kiểm tra định dạng cơ bản để báo lỗi sớm; gotrips-api kiểm lại bằng cùng định dạng.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Đăng ký nhận ưu đãi qua email. */
export const newsletterSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập địa chỉ email.")
    .regex(EMAIL_PATTERN, "Địa chỉ email chưa đúng định dạng, ví dụ: ban@example.com."),
});

export type NewsletterFormValues = z.infer<typeof newsletterSchema>;
