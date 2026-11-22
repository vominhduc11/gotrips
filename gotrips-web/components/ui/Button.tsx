import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { AppLink } from "./AppLink";

type ButtonVariant = "primary" | "accent" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary-700 text-white hover:bg-primary-800",
  // Cam đậm (accent-700) để chữ trắng đạt tương phản AA.
  accent: "bg-accent-700 text-white hover:bg-accent-800",
  outline: "border border-primary-700 bg-surface text-primary-800 hover:bg-primary-50",
  ghost: "text-ink hover:bg-neutral-100",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-11 px-5 text-base",
  lg: "h-12 px-6 text-base",
};

export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return cn(base, variants[variant], sizes[size], className);
}

type CommonProps = { variant?: ButtonVariant; size?: ButtonSize };

/** Nút bấm (`<button>`). */
export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={buttonStyles({ variant, size, className })} {...props} />;
}

/** Liên kết trông như nút (`<a>` qua next/link). */
export function ButtonLink({
  variant,
  size,
  className,
  href,
  ...props
}: CommonProps & { href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return <AppLink href={href} className={buttonStyles({ variant, size, className })} {...props} />;
}
