import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Khung nội dung căn giữa, rộng tối đa `--container-page`, lề 16/24/32px theo màn hình. */
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-page px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}
