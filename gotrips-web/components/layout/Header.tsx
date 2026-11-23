import { Suspense } from "react";
import { AppLink } from "@/components/common/AppLink";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/common/Container";
import { HeaderAuth, HeaderMobileNav } from "./HeaderAuth";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";
import { NAV_ITEMS } from "./nav-items";

/**
 * Header dính đầu trang. Server Component (MobileNav và UserMenu là client); phần tài khoản đọc phiên đăng nhập.
 * Chưa đánh dấu mục menu "đang chọn" vì cần `usePathname`, mà hook này ở layout buộc phải bọc `Suspense`
 * khi có route động chưa biết trước — để dành khi có nhiều trang hơn.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-surface/95 shadow-header backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Logo />

        <nav aria-label="Điều hướng chính" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.label}>
                {item.href ? (
                  <AppLink
                    href={item.href}
                    className="rounded-control px-3 py-2 text-[0.95rem] font-medium text-ink hover:bg-primary-50 hover:text-primary-800"
                  >
                    {item.label}
                  </AppLink>
                ) : (
                  <span className="flex items-center gap-2 px-3 py-2 text-[0.95rem] font-medium text-ink-muted">
                    {item.label}
                    {item.comingSoon ? <Badge variant="soon">Sắp ra mắt</Badge> : null}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Cookie phiên là dữ liệu theo yêu cầu → stream trong Suspense, phần còn lại của Header vẫn prerender. */}
        <div className="hidden min-h-10 min-w-40 items-center justify-end gap-2 lg:flex">
          <Suspense fallback={null}>
            <HeaderAuth />
          </Suspense>
        </div>

        <Suspense fallback={<MobileNav items={NAV_ITEMS} user={null} />}>
          <HeaderMobileNav />
        </Suspense>
      </Container>
    </header>
  );
}
