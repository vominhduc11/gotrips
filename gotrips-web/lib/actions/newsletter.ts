"use server";

import { subscribeNewsletter } from "@/lib/api/generated";
import { ApiError } from "@/lib/api/http";
import { newsletterSchema } from "@/lib/schemas/newsletter";
import { fromApiFieldErrors, toFieldErrors } from "./field-errors";
import { SERVICE_UNAVAILABLE_MESSAGE } from "./messages";

/** Kết quả trả về form; lỗi theo field được form gắn lại vào đúng ô (khớp tên field trong schema). */
export type NewsletterActionResult =
  | { ok: true }
  | { ok: false; message?: string; fieldErrors?: Record<string, string> };

/** Tên field của form — lỗi API chỉ được gắn vào những ô này. */
const NEWSLETTER_FIELDS = ["email"] as const;

/**
 * Đăng ký nhận ưu đãi qua email (gọi `POST /newsletter/subscriptions` của gotrips-api).
 *
 * API trả 204 cả khi email đã đăng ký từ trước (không lộ email nào đã có trong danh sách), nên "thành công" ở đây không
 * cho biết email là mới hay cũ — form cũng không được suy đoán điều đó.
 */
export async function subscribeNewsletterAction(values: unknown): Promise<NewsletterActionResult> {
  // Kiểm lại ở server: Server Action là endpoint công khai, không tin dữ liệu từ trình duyệt.
  const parsed = newsletterSchema.safeParse(values);
  if (!parsed.success) return { ok: false, fieldErrors: toFieldErrors(parsed.error.issues) };

  try {
    await subscribeNewsletter({ email: parsed.data.email });
    return { ok: true };
  } catch (error) {
    // Lỗi 4xx của API (kiểm lại luật email) gắn vào ô; còn lại (mạng, hết thời gian chờ, 5xx) là sự cố hệ thống.
    if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
      const fieldErrors = fromApiFieldErrors(error.errors, NEWSLETTER_FIELDS);
      if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
      return { ok: false, message: error.detail ?? error.title };
    }
    // Không ghi email vào log, chỉ ghi nguyên nhân.
    console.error("[newsletter] Đăng ký thất bại:", error instanceof Error ? `${error.name}: ${error.message}` : error);
    return { ok: false, message: SERVICE_UNAVAILABLE_MESSAGE };
  }
}
