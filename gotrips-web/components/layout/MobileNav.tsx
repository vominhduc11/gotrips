"use client";

import { useEffect, useRef, useState } from "react";
import { AppLink } from "@/components/common/AppLink";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Menu } from "lucide-react";
import type { NavItem } from "./nav-items";

/** Menu hamburger cho màn hình < lg. Đóng bằng Esc, bằng nút, hoặc khi chọn một liên kết. */
export function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="menu-di-dong"
        aria-label={open ? "Đóng menu" : "Mở menu"}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-11 items-center justify-center rounded-control text-ink hover:bg-neutral-100"
      >
        {open ? <X aria-hidden="true" className="size-6" /> : <Menu aria-hidden="true" className="size-6" />}
      </button>

      {open ? (
        <nav
          id="menu-di-dong"
          aria-label="Menu di động"
          className="absolute inset-x-0 top-full border-t border-line bg-surface shadow-header"
        >
          <ul className="mx-auto max-w-page px-4 py-3 sm:px-6">
            {items.map((item) => (
              <li key={item.label}>
                {item.href ? (
                  <AppLink
                    href={item.href}
                    onClick={close}
                    className="flex min-h-12 items-center rounded-control px-3 text-base font-medium text-ink hover:bg-primary-50"
                  >
                    {item.label}
                  </AppLink>
                ) : (
                  <span className="flex min-h-12 items-center gap-2 px-3 text-base font-medium text-ink-muted">
                    {item.label}
                    {item.comingSoon ? <Badge variant="soon">Sắp ra mắt</Badge> : null}
                  </span>
                )}
              </li>
            ))}
            <li className="mt-2 grid grid-cols-2 gap-3 border-t border-line pt-4">
              <Button asChild variant="outline"><AppLink href="/login" onClick={close}>
                Đăng nhập
              </AppLink></Button>
              <Button asChild variant="primary"><AppLink href="/register" onClick={close}>
                Đăng ký
              </AppLink></Button>
            </li>
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
