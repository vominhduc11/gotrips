import { cn } from "@/lib/cn";

/** Tiêu đề section (luôn là `h2` — `h1` duy nhất của trang nằm ở Hero). `id` dùng cho `aria-labelledby` của section. */
export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  align = "left",
  tone = "light",
  className,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  /** `dark`: dùng trên nền tối. */
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow ? (
        <p
          className={cn(
            "text-sm font-semibold uppercase tracking-wide",
            tone === "dark" ? "text-primary-200" : "text-accent-700",
          )}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2
        id={id}
        className={cn(
          "mt-1 text-2xl font-bold tracking-tight sm:text-3xl",
          tone === "dark" ? "text-white" : "text-ink",
        )}
      >
        {title}
      </h2>
      {description ? (
        <p className={cn("mt-3 text-base leading-7", tone === "dark" ? "text-primary-100" : "text-ink-muted")}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
