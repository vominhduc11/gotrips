import { AppLink } from "@/components/common/AppLink";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { MobileNav } from "./MobileNav";
import { NAV_ITEMS } from "./nav-items";
import { UserMenu } from "./UserMenu";

/**
 * Khu vực tài khoản bên phải Header (desktop). Đọc cookie phiên nên là dữ liệu theo yêu cầu:
 * Header bọc component này trong `<Suspense>` để phần còn lại của trang vẫn prerender được.
 */
export async function HeaderAuth() {
  const user = await getCurrentUser();

  if (user) return <UserMenu user={user} />;

  return (
    <>
      <Button asChild variant="ghost" size="sm">
        <AppLink href="/login">Đăng nhập</AppLink>
      </Button>
      <Button asChild variant="primary" size="sm">
        <AppLink href="/register">Đăng ký</AppLink>
      </Button>
    </>
  );
}

/** Menu di động biết người dùng hiện tại (hiện chào + đăng xuất thay cho Đăng nhập/Đăng ký). */
export async function HeaderMobileNav() {
  const user = await getCurrentUser();
  return <MobileNav items={NAV_ITEMS} user={user} />;
}
