import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { SERVICE_UNAVAILABLE } from '@/components/common/error-state'
import { ApiError } from '@/lib/api/http'

const forbiddenMessage = 'Bạn không có quyền thực hiện thao tác này.'

/** Câu hiển thị cho một lỗi gọi API, hoặc `null` khi phiên đã hết (đã có xử lý chung đưa về đăng nhập). */
export function apiErrorMessage(error: unknown): string | null {
  if (!(error instanceof ApiError)) return SERVICE_UNAVAILABLE
  if (error.status === 401) return null
  if (error.status === 403) return forbiddenMessage
  // 4xx mang câu tiếng Việt an toàn trong `detail`; 5xx (kể cả trang HTML của proxy) thì dùng câu chung.
  return error.status < 500 ? error.detail ?? SERVICE_UNAVAILABLE : SERVICE_UNAVAILABLE
}

/** API ghi phần tử danh sách kiểu Java (`images[0].url`), React Hook Form dùng dấu chấm (`images.0.url`). */
const toFormPath = (field: string) => field.replace(/\[(\d+)\]/g, '.$1')

/**
 * Gắn `errors[]` của API vào đúng ô của form. Trả câu cần hiện ở đầu form: lỗi không gắn được vào ô nào, hoặc `null`
 * khi mọi lỗi đã nằm ở ô (hoặc phiên đã hết).
 *
 * @param fields tên các ô của form, trùng tên field trong request, theo thứ tự trên màn hình (ô lỗi đầu tiên được focus).
 *   Ô trong danh sách viết theo kiểu React Hook Form và liệt kê theo số dòng đang có.
 */
export function applyApiErrors<TValues extends FieldValues>(
  error: unknown, fields: readonly Path<TValues>[], setError: UseFormSetError<TValues>,
): string | null {
  const violations = error instanceof ApiError && (error.status === 400 || error.status === 409)
    ? (error.errors ?? []).map((item) => ({ ...item, field: toFormPath(item.field) }))
    : []
  const placed = fields.flatMap((field) => {
    const violation = violations.find((item) => item.field === field)
    return violation ? [{ field, message: violation.message }] : []
  })
  placed.forEach(({ field, message }, index) => setError(field, { message }, { shouldFocus: index === 0 }))

  const everyViolationPlaced = violations.length > 0 &&
    violations.every((item) => placed.some(({ field }) => field === item.field))
  return everyViolationPlaced ? null : apiErrorMessage(error)
}
