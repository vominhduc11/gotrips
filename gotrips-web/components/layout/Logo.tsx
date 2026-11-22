import { cn } from "@/lib/cn";
import { AppLink } from "@/components/common/AppLink";

/** Logo chữ "GoTrips". `tone="dark"` dùng trên nền tối (footer). */
export function Logo({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  return (
    <AppLink
      href="/"
      aria-label="GoTrips – Trang chủ"
      className={cn("inline-flex items-baseline text-2xl font-extrabold tracking-tight", className)}
    >
      <span className={tone === "dark" ? "text-accent-200" : "text-accent-700"}>Go</span>
      <span className={tone === "dark" ? "text-white" : "text-primary-800"}>Trips</span>
    </AppLink>
  );
}
