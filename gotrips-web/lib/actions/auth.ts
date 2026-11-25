"use server";

import { login, register } from "@/lib/api/generated";
import { ApiError } from "@/lib/api/http";
import { createSession, destroySession } from "@/lib/auth/session";
import { buildLoginHref, getSafeRedirectPath } from "@/lib/safe-redirect";
import { loginSchema, registerSchema } from "@/lib/schemas/auth";
import { fromApiFieldErrors, toFieldErrors } from "./field-errors";
import { SERVICE_UNAVAILABLE_MESSAGE } from "./messages";

/** Kết quả trả về form; lỗi theo field được form gắn lại vào đúng ô (khớp tên field trong schema). */
export type AuthActionResult =
  | { ok: true; redirectTo: string }
  | { ok: false; message?: string; fieldErrors?: Record<string, string> };

// Hai action này gọi gotrips-api (`POST /auth/login`, `POST /auth/register`) bằng client do Orval sinh
// (lib/api/generated). Giữ nguyên chữ ký và kiểu `AuthActionResult` để form không phải đổi.

/** Tên field của form đăng nhập / đăng ký — lỗi API chỉ được gắn vào những ô này. */
const LOGIN_FIELDS = ["email", "password"] as const;
const REGISTER_FIELDS = ["fullName", "email", "password"] as const;

const WRONG_CREDENTIALS_MESSAGE = "Email hoặc mật khẩu không đúng. Bạn vui lòng kiểm tra lại nhé.";

/** Lỗi 4xx mà API trả theo ProblemDetail → kết quả cho form; các lỗi còn lại (mạng, 5xx...) là sự cố hệ thống. */
function toFailure(error: unknown, fields: readonly string[], action: string): AuthActionResult {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    const fieldErrors = fromApiFieldErrors(error.errors, fields);
    if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
    return { ok: false, message: error.detail ?? error.title };
  }
  // Không ghi dữ liệu người dùng (email/mật khẩu) vào log, chỉ ghi nguyên nhân.
  console.error(`[auth] ${action} thất bại:`, error instanceof Error ? error.message : error);
  return { ok: false, message: SERVICE_UNAVAILABLE_MESSAGE };
}

/**
 * @param next đích quay lại sau khi đăng nhập (từ `/login?next=...`, ví dụ bước "Thông tin" của luồng đặt tour).
 *             Dữ liệu từ URL nên được lọc bằng `getSafeRedirectPath` (chỉ đường dẫn nội bộ).
 */
export async function loginAction(values: unknown, next?: unknown): Promise<AuthActionResult> {
  // Kiểm lại ở server: Server Action là endpoint công khai, không tin dữ liệu từ trình duyệt.
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) return { ok: false, fieldErrors: toFieldErrors(parsed.error.issues) };

  let session: { accessToken: string; expiresIn: number };
  try {
    const { data } = await login(parsed.data);
    session = data;
  } catch (error) {
    // Thông báo chung cho cả "sai email" lẫn "sai mật khẩu" (API cũng không phân biệt) để không lộ email nào đã đăng ký.
    if (error instanceof ApiError && error.status === 401) return { ok: false, message: WRONG_CREDENTIALS_MESSAGE };
    return toFailure(error, LOGIN_FIELDS, "Đăng nhập");
  }

  // Token chỉ được lưu vào cookie httpOnly; không trả về cho trình duyệt.
  await createSession(session.accessToken, session.expiresIn);
  return { ok: true, redirectTo: getSafeRedirectPath(next) };
}

/** Đăng xuất: xoá cookie phiên. Next tự làm mới giao diện vì cookie đổi trong Server Action. */
export async function logoutAction(): Promise<void> {
  await destroySession();
}

/** @param next giữ nguyên đích quay lại khi khách đi từ `/login?next=...` sang đăng ký rồi quay về đăng nhập. */
export async function registerAction(values: unknown, next?: unknown): Promise<AuthActionResult> {
  const parsed = registerSchema.safeParse(values);
  if (!parsed.success) return { ok: false, fieldErrors: toFieldErrors(parsed.error.issues) };

  // `confirmPassword` và `acceptTerms` chỉ để kiểm ở form, không gửi lên API.
  const { fullName, email, password } = parsed.data;
  try {
    await register({ fullName, email, password });
  } catch (error) {
    // 409 (email đã đăng ký) và 400 (API kiểm lại luật) đều kèm `errors[]` theo field → hiện đúng ô.
    return toFailure(error, REGISTER_FIELDS, "Đăng ký");
  }

  // Đăng ký xong chuyển sang đăng nhập (chưa tự đăng nhập), giữ đích `next` nếu có.
  return { ok: true, redirectTo: buildLoginHref(getSafeRedirectPath(next, "")) };
}
