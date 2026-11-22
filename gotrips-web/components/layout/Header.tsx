import { AppLink } from "@/components/common/AppLink";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/common/Container";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";
import { NAV_ITEMS } from "./nav-items";

/**
 * Header dính đầu trang. Server Component hoàn toàn (chỉ MobileNav là client).
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

        <div className="hidden items-center gap-2 lg:flex">
          <Button asChild variant="ghost" size="sm"><AppLink href="/login">
            Đăng nhập
          </AppLink></Button>
          <Button asChild variant="primary" size="sm"><AppLink href="/register">
            Đăng ký
          </AppLink></Button>
        </div>

        <MobileNav items={NAV_ITEMS} />
      </Container>
    </header>
  );
}
