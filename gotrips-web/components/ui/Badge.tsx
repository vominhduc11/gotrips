import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * - `soon`    : "Sắp ra mắt" (nền nhạt, dùng trên nền sáng)
 * - `discount`: giảm giá (nền cam đậm, chữ trắng — dùng được trên ảnh)
 * - `warning` : "Sắp hết chỗ" (nền đỏ đậm, chữ trắng — dùng được trên ảnh)
 * - `neutral` : nhãn trung tính
 */
type BadgeVariant = "soon" | "discount" | "warning" | "neutral";

const variants: Record<BadgeVariant, string> = {
  soon: "bg-accent-100 text-accent-800",
  discount: "bg-accent-700 text-white",
  warning: "bg-danger-700 text-white",
  neutral: "bg-neutral-100 text-neutral-700",
};

export function Badge({
  variant = "neutral",
  children,
  className,
}: {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-pill px-2.5 py-0.5 text-xs font-semibold leading-5",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
