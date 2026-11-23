/** Người dùng đang đăng nhập, đúng phần giao diện cần (không chứa mật khẩu/token). */
export type SessionUser = {
  name: string;
  email: string;
};

/**
 * Chữ viết tắt cho avatar: chữ cái đầu của từ đầu và từ cuối ("Nguyễn Văn An" → "NA").
 * Tách khỏi component để test được và dùng chung cho Header lẫn menu di động.
 */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0]!;
  const last = words[words.length - 1]!;
  const letters = words.length === 1 ? first.charAt(0) : first.charAt(0) + last.charAt(0);
  return letters.toLocaleUpperCase("vi-VN");
}
