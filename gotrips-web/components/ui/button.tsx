import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/cn"

/**
 * Nút của GoTrips (đã tuỳ biến từ shadcn). Màu chỉ dùng token trong app/globals.css.
 * - `primary` (mặc định): teal đậm, chữ trắng đạt AA.
 * - `accent`: cam đậm (accent-700) cho CTA, chữ trắng đạt AA.
 * - `outline`, `ghost`: nút phụ.
 * Kích thước chạm: sm = h-10, md = h-11, lg = h-12.
 * Muốn nút trông như liên kết: `<Button asChild><AppLink href="..."/></Button>`.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary-700 text-white hover:bg-primary-800",
        accent: "bg-accent-700 text-white hover:bg-accent-800",
        outline: "border border-primary-700 bg-surface text-primary-800 hover:bg-primary-50",
        ghost: "text-ink hover:bg-neutral-100",
      },
      size: {
        sm: "h-10 px-4 text-sm",
        md: "h-11 px-5 text-base",
        lg: "h-12 px-6 text-base",
        // Nút chỉ có icon (đóng dialog, chuyển carousel...): vuông, đạt vùng chạm tối thiểu.
        icon: "size-11",
        "icon-sm": "size-10",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

function Button({
  className,
  variant = "primary",
  size = "md",
  asChild = false,
  type = "button",
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      // `type` chỉ có nghĩa với <button>; khi asChild (vd. <a>) thì không truyền xuống.
      type={asChild ? undefined : type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
