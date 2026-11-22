/** Ghép class có điều kiện: `cn("a", cond && "b")`. Không gộp xung đột Tailwind — tránh truyền class chồng nhau. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
