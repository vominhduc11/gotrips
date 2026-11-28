import "server-only";

import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { cache } from "react";
import { getMe } from "@/lib/api/generated";
import { ApiError } from "@/lib/api/http";
import type { SessionUser } from "./user";

export const SESSION_COOKIE = "gotrips_session";

/**
 * Cookie phiên chứa **access token (JWT) do gotrips-api cấp**, không chứa dữ liệu người dùng. Token nằm trong
 * cookie httpOnly nên JavaScript trên trình duyệt không đọc được; chỉ phía server (Server Component / Server
 * Action) lấy ra để gọi API. Hạn cookie lấy theo `expiresIn` của token để hai thứ hết hạn cùng lúc.
 */
export async function createSession(accessToken: string, maxAgeSeconds: number): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, accessToken, {
    httpOnly: true, // JS trên trình duyệt không đọc được cookie phiên
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
    // Chưa bật `secure`: bản Docker chạy HTTP. Bật khi triển khai sau HTTPS.
  });
}

/**
 * Đăng xuất = xoá cookie. API dùng JWT không lưu trạng thái nên không có gì để huỷ phía server; token cũ vẫn
 * hợp lệ tới khi hết hạn, vì vậy token chỉ nằm trong cookie httpOnly này và không được ghi ra chỗ khác.
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** Token của phiên hiện tại (để gọi các API cần đăng nhập), hoặc `undefined` nếu chưa đăng nhập. */
export async function getSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value || undefined;
}

/**
 * Người dùng hiện tại, hoặc `null` nếu chưa đăng nhập. Hỏi API (`GET /auth/me`) chứ không tự giải mã token ở web:
 * API mới là nơi biết token còn hợp lệ không và tài khoản còn tồn tại không.
 *
 * Đọc cookie nên là dữ liệu theo yêu cầu (request-time): với `cacheComponents`, chỉ gọi từ component nằm trong
 * `<Suspense>`, và không đặt trong phạm vi `"use cache"`. Bọc bằng `cache()` của React để Header, lời chào Trang chủ,
 * trang đặt chỗ... cùng gọi trong một lượt render mà chỉ tốn một request tới API.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = await getSessionToken();
  if (!token) return null;

  try {
    const { data } = await getMe({
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store", // dữ liệu theo từng người dùng: tuyệt đối không để cache dùng chung
    });
    return { name: data.fullName, email: data.email, phone: data.phone };
  } catch (error) {
    // Lỗi nội bộ của Next (vd fetch bị ngắt khi lượt prerender/prefetch kết thúc) phải được ném lại để Next xử lý.
    // Nuốt nó thì lượt render đó sẽ coi người đã đăng nhập là khách.
    unstable_rethrow(error);
    // 401: token hết hạn, sai chữ ký hoặc tài khoản đã bị xoá → coi như chưa đăng nhập. (Không xoá được cookie ở
    // đây vì Server Component không được ghi cookie; cookie cũ vô hại và tự hết hạn.)
    if (error instanceof ApiError && error.status === 401) return null;
    // API sập/chậm/lỗi 5xx: không làm hỏng cả trang, chỉ hiển thị như khách. Không ghi token vào log.
    console.error("[auth] Không lấy được người dùng hiện tại từ API:", error instanceof Error ? error.message : error);
    return null;
  }
});
