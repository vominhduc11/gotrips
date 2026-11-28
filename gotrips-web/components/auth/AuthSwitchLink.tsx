"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect, useState, type ReactNode } from "react";
import { AppLink } from "@/components/common/AppLink";
import { buildAuthHref, type AuthPath } from "@/lib/safe-redirect";

/** Chỉ gọi ở phía client. `next` được lọc trong `buildAuthHref`. */
function readHref(to: AuthPath): string {
  return buildAuthHref(to, new URLSearchParams(window.location.search).get("next"));
}

/**
 * Liên kết chuyển qua lại giữa `/login` và `/register`, giữ đích quay lại `?next=`.
 *
 * Không đọc URL lúc render (`useSearchParams` làm hai trang mất static shell): HTML prerender trỏ tới trang trơn, sau
 * khi mount mới gắn `next` vào `href` (để cả mở tab mới cũng giữ được). Next (`cacheComponents`) giữ trang đã ghé
 * trong `<Activity>` và chạy lại effect khi hiện lại. Nhưng khi chỉ query đổi ngay trên trang đang mở thì effect có
 * thể không chạy lại, nên lúc bấm đọc URL thêm lần nữa.
 */
export function AuthSwitchLink({ to, className, children }: { to: AuthPath; className?: string; children: ReactNode }) {
  const router = useRouter();
  const [href, setHref] = useState<string>(to);

  useLayoutEffect(() => {
    // Cố ý render thêm một lượt: server không biết URL, còn đọc `window.location` lúc render thì lệch hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHref(readHref(to));
  }, [to]);

  return (
    <AppLink
      href={href}
      className={className}
      onNavigate={(event) => {
        const current = readHref(to);
        if (current === href) return;
        event.preventDefault();
        setHref(current);
        router.push(current);
      }}
    >
      {children}
    </AppLink>
  );
}
