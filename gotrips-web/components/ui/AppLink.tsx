import Link from "next/link";
import type { ComponentProps } from "react";

/**
 * `next/link` với `prefetch={false}` mặc định.
 *
 * Ở giai đoạn prototype nhiều đích đến (/tours, /login, /register...) CHƯA tồn tại; Next prefetch ở production
 * sẽ bắn request 404 vào console. Khi các trang đã có, bỏ default này (hoặc truyền `prefetch` tường minh).
 */
export function AppLink({ prefetch = false, ...props }: ComponentProps<typeof Link>) {
  return <Link prefetch={prefetch} {...props} />;
}
