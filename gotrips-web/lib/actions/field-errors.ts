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

/** Tên field kiểu Spring (`travelers[0].fullName`) → đường dẫn kiểu React Hook Form (`travelers.0.fullName`). */
export function toFormPath(apiField: string): string {
  return apiField.replace(/\[(\d+)\]/g, ".$1");
}

/**
 * Lỗi theo field mà API trả về (`errors: [{ field, message }]` trong ProblemDetail) → cùng dạng với `toFieldErrors`.
 * Chỉ giữ field mà form có thật (danh sách tên, hoặc hàm kiểm theo đường dẫn đã đổi sang kiểu form): tên field lạ từ
 * API không có ô để hiển thị nên bỏ qua, khi đó action dùng `message` chung. Lỗi đầu tiên của mỗi field được giữ.
 */
export function fromApiFieldErrors(
  errors: readonly ApiFieldError[] | undefined,
  allowedFields: readonly string[] | ((field: string) => boolean),
): Record<string, string> {
  const isAllowed =
    typeof allowedFields === "function" ? allowedFields : (field: string) => allowedFields.includes(field);
  const fieldErrors: Record<string, string> = {};
  for (const { field: apiField, message } of errors ?? []) {
    const field = toFormPath(apiField);
    if (isAllowed(field) && !(field in fieldErrors)) fieldErrors[field] = message;
  }
  return fieldErrors;
}
