import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/cn"

/**
 * Nhãn nhỏ của GoTrips (đã tuỳ biến từ shadcn).
 * - `soon`    : "Sắp ra mắt" (nền nhạt, dùng trên nền sáng)
 * - `discount`: giảm giá (nền cam đậm, chữ trắng — dùng được trên ảnh)
 * - `warning` : "Sắp hết chỗ" (nền đỏ đậm, chữ trắng — dùng được trên ảnh)
 * - `neutral` : nhãn trung tính (mặc định)
 * - `info`    : trạng thái đang xử lý, ví dụ "Chờ xác nhận" (nền teal nhạt)
 * - `success` : trạng thái hoàn tất, ví dụ "Đã xác nhận", "Đã thanh toán" (nền xanh lá nhạt)
 * Các nhãn nền nhạt đều dùng chữ ≥ 700 để đạt tương phản AA.
 */
const badgeVariants = cva(
  "inline-flex items-center whitespace-nowrap rounded-pill px-2.5 py-0.5 text-xs font-semibold leading-5",
  {
    variants: {
      variant: {
        soon: "bg-accent-100 text-accent-800",
        discount: "bg-accent-700 text-white",
        warning: "bg-danger-700 text-white",
        neutral: "bg-neutral-100 text-neutral-700",
        info: "bg-primary-50 text-primary-800",
        success: "bg-success-100 text-success-700",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

function Badge({
  className,
  variant = "neutral",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
