"use server";

import { DEMO_ACCOUNT } from "@/lib/auth/demo-account";
import { createSession, destroySession } from "@/lib/auth/session";
import { loginSchema, registerSchema } from "@/lib/schemas/auth";

/** Kết quả trả về form; lỗi theo field được form gắn lại vào đúng ô (khớp tên field trong schema). */
export type AuthActionResult =
  | { ok: true; redirectTo: string }
  | { ok: false; message?: string; fieldErrors?: Record<string, string> };

// PROTOTYPE: chưa nối backend/DB — không lưu tài khoản; đăng nhập đúng tài khoản demo thì đặt cookie phiên
// (lib/auth/session.ts) để Header/trang chủ hiện theo người dùng. Đăng ký hợp lệ là coi như thành công.
// Khi gotrips-api có `/auth/login` và `/auth/register`: thay đoạn so khớp bằng `apiFetch`
// (lib/api/http.ts), lưu token API cấp vào cookie phiên, map `ApiError.errors` sang `fieldErrors`.
// Giữ nguyên chữ ký và kiểu `AuthActionResult` để form không phải sửa.

/** Độ trễ giả lập thời gian gọi API để thấy được trạng thái đang tải của form. Xoá cùng đoạn demo khi nối API thật. */
const DEMO_LATENCY_MS = 1200;
const simulateLatency = () => new Promise<void>((resolve) => setTimeout(resolve, DEMO_LATENCY_MS));

/** Lấy lỗi đầu tiên của mỗi field từ kết quả `safeParse` thất bại. */
function toFieldErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !(field in fieldErrors)) fieldErrors[field] = issue.message;
  }
  return fieldErrors;
}

export async function loginAction(values: unknown): Promise<AuthActionResult> {
  // Kiểm lại ở server: Server Action là endpoint công khai, không tin dữ liệu từ trình duyệt.
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) return { ok: false, fieldErrors: toFieldErrors(parsed.error.issues) };

  await simulateLatency();

  // Thông báo chung cho cả "sai email" lẫn "sai mật khẩu" để không lộ email nào đã đăng ký.
  const { email, password } = parsed.data;
  if (email.toLowerCase() !== DEMO_ACCOUNT.email || password !== DEMO_ACCOUNT.password) {
    return { ok: false, message: "Email hoặc mật khẩu không đúng. Bạn vui lòng kiểm tra lại nhé." };
  }
  await createSession(DEMO_ACCOUNT.email);
  return { ok: true, redirectTo: "/" };
}

/** Đăng xuất: xoá cookie phiên. Next tự làm mới giao diện vì cookie đổi trong Server Action. */
export async function logoutAction(): Promise<void> {
  await destroySession();
}

export async function registerAction(values: unknown): Promise<AuthActionResult> {
  const parsed = registerSchema.safeParse(values);
  if (!parsed.success) return { ok: false, fieldErrors: toFieldErrors(parsed.error.issues) };

  await simulateLatency();

  // Đăng ký xong chuyển sang đăng nhập (chưa lưu tài khoản nên chưa thể tự đăng nhập).
  return { ok: true, redirectTo: "/login" };
}
