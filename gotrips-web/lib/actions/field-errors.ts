import type { ApiFieldError } from "@/lib/api/http";

/**
 * Lỗi đầu tiên của mỗi field từ kết quả `safeParse` thất bại, khoá theo đường dẫn kiểu React Hook Form
 * (`"email"`, `"contact.phone"`, `"travelers.0.fullName"`), để form `setError` lại đúng ô.
 * Lỗi không gắn với field nào (path rỗng) bị bỏ qua: action tự trả `message` chung cho trường hợp đó.
 */
export function toFieldErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const field = issue.path.map(String).join(".");
    if (field && !(field in fieldErrors)) fieldErrors[field] = issue.message;
  }
  return fieldErrors;
}

/**
 * Lỗi theo field mà API trả về (`errors: [{ field, message }]` trong ProblemDetail) → cùng dạng với `toFieldErrors`.
 * Chỉ giữ field mà form có thật (`allowedFields`): tên field lạ từ API không có ô để hiển thị nên bỏ qua,
 * khi đó action dùng `message` chung. Lỗi đầu tiên của mỗi field được giữ.
 */
export function fromApiFieldErrors(
  errors: readonly ApiFieldError[] | undefined,
  allowedFields: readonly string[],
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const { field, message } of errors ?? []) {
    if (allowedFields.includes(field) && !(field in fieldErrors)) fieldErrors[field] = message;
  }
  return fieldErrors;
}
