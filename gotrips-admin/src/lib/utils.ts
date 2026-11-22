/**
 * Ghép class name. Đây là hàm `cn` dùng chung cho các component shadcn (alias utils trong components.json).
 *
 * Nhận string, số, boolean, mảng và object { "class": điều_kiện } như chữ ký của shadcn (chart.tsx truyền object).
 * Chưa gộp class xung đột (ví dụ `p-2` và `p-4`), vì chưa cài tailwind-merge. Tránh truyền hai class cùng nhóm.
 * Nếu cần gộp đúng, phải hỏi người dùng duyệt thêm tailwind-merge trước (CLAUDE.md, mục "Quy tắc dùng thư viện").
 */
export type ClassValue = string | number | boolean | null | undefined | ClassDictionary | ClassValue[]
export type ClassDictionary = Record<string, unknown>

export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = []

  for (const input of inputs) {
    if (!input) continue

    if (typeof input === 'string' || typeof input === 'number') {
      classes.push(String(input))
    } else if (Array.isArray(input)) {
      // Đệ quy để mảng lồng nhau (ví dụ [ "a", [ "b", false ] ]) cũng được xử lý.
      const nested = cn(...input)
      if (nested) classes.push(nested)
    } else if (typeof input === 'object') {
      for (const [className, condition] of Object.entries(input)) {
        if (condition) classes.push(className)
      }
    }
  }

  return classes.join(' ')
}
