import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Bộ gộp class có biết các token riêng của GoTrips (khai báo trong `@theme` ở app/globals.css).
 * Nếu thêm token mới vào `@theme`, nhớ khai báo ở đây — nếu không `tailwind-merge` không nhận ra
 * và sẽ coi `rounded-card` / `shadow-card` / `max-w-page` là nhóm khác, nên không gộp được chồng chéo.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ["control", "card", "pill"],
      shadow: ["card", "card-hover", "search", "header"],
      container: ["page"], // max-w-page
    },
  },
});

/**
 * Ghép class có điều kiện và tự gộp class Tailwind xung đột (class sau thắng):
 * `cn("px-2", cond && "px-4")` → `"px-4"`.
 * Đây là hàm `cn` duy nhất của dự án (alias `utils` của shadcn trong components.json trỏ về đây).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
