import type { FieldErrors, FieldValues } from "react-hook-form";

/**
 * Đưa focus vào ô lỗi đầu tiên sau khi submit không hợp lệ (đúng thứ tự trên màn hình), để người dùng bàn phím
 * và trình đọc màn hình biết chỗ cần sửa.
 *
 * Các ô tìm kiếm là nút mở Popover (không phải `<input>` đăng ký với React Hook Form), nên tính năng tự focus
 * lỗi của RHF không áp dụng được — phải focus theo `id` của nút.
 *
 * @param order các cặp [tên trường trong form, id phần tử cần focus], theo thứ tự hiển thị.
 */
export function focusFirstError<T extends FieldValues>(
  errors: FieldErrors<T>,
  order: ReadonlyArray<readonly [keyof T & string, string]>,
): void {
  const target = order.find(([name]) => errors[name]);
  if (target) document.getElementById(target[1])?.focus();
}
