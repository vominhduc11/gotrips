/**
 * Đích quay lại sau khi đăng nhập (`/login?next=...`). `next` do URL mang tới nên không tin được: chỉ nhận đường dẫn
 * nội bộ, nếu không kẻ xấu gửi liên kết `/login?next=https://gia-mao.com` để đưa người dùng sang trang lừa đảo
 * ngay sau khi đăng nhập thật (open redirect).
 *
 * Hợp lệ: bắt đầu bằng đúng một `/` (đường dẫn tuyệt đối trong site). Bị chặn:
 *  - URL đầy đủ (`https://...`, `javascript:...`);
 *  - `//evil.com` và `/\evil.com` — trình duyệt hiểu là "cùng giao thức, sang host khác";
 *  - ký tự điều khiển (xuống dòng, tab...) mà trình duyệt có thể tự bỏ đi rồi ghép thành `//`;
 *  - chuỗi quá dài.
 */
const MAX_LENGTH = 2000;

export function getSafeRedirectPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_LENGTH) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  return value;
}

/** `/login?next=<đường dẫn>` (đường dẫn đã mã hoá). Đường dẫn không an toàn thì bỏ `next`. */
export function buildLoginHref(next: string): string {
  const safe = getSafeRedirectPath(next, "");
  return safe ? `/login?next=${encodeURIComponent(safe)}` : "/login";
}
