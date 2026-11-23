import { getCurrentUser } from "@/lib/auth/session";

const GUEST_TEXT = "Đặt tour du lịch trực tuyến";

/**
 * Dòng nhãn phía trên `h1` của Hero: chào theo tên khi đã đăng nhập, còn lại giữ chữ mặc định.
 * Đọc cookie phiên (dữ liệu theo yêu cầu) nên trang chủ bọc trong `<Suspense>` với chữ mặc định làm fallback.
 */
export async function HeroGreeting() {
  const user = await getCurrentUser();
  return (
    <span data-testid="hero-greeting">
      {user ? `Xin chào, ${user.name} — hôm nay bạn muốn đi đâu?` : GUEST_TEXT}
    </span>
  );
}

export function HeroGreetingFallback() {
  return <span>{GUEST_TEXT}</span>;
}
