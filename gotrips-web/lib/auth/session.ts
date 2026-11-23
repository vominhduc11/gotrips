import "server-only";

import { cookies } from "next/headers";
import { DEMO_ACCOUNT } from "./demo-account";
import type { SessionUser } from "./user";

export const SESSION_COOKIE = "gotrips_session";
/** 7 ngày. Khi có API thật, lấy theo thời hạn của token/refresh token. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/**
 * PROTOTYPE: cookie chỉ chứa email của tài khoản demo, không ký/mã hoá — vì chưa có dữ liệu thật nào
 * đứng sau phiên này. Khi gotrips-api có xác thực: cookie chứa token do API cấp, và `getCurrentUser`
 * gọi API (`/auth/me`) thay cho đoạn so khớp bên dưới. Giữ nguyên chữ ký để component không phải sửa.
 */
export async function createSession(email: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, email, {
    httpOnly: true, // JS trên trình duyệt không đọc được cookie phiên
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    // Chưa bật `secure`: bản Docker chạy HTTP. Bật khi triển khai sau HTTPS.
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Người dùng hiện tại, hoặc `null` nếu chưa đăng nhập. Đọc cookie nên là dữ liệu theo yêu cầu (request-time):
 * với `cacheComponents`, chỉ gọi từ component nằm trong `<Suspense>`, và không đặt trong phạm vi `"use cache"`.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  if (!value || value.toLowerCase() !== DEMO_ACCOUNT.email) return null;
  return { name: DEMO_ACCOUNT.name, email: DEMO_ACCOUNT.email };
}
