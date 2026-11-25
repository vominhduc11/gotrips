/**
 * Class dùng chung cho các ô trong form tìm Tour / Khách sạn / Vé máy bay, để ba tab trông đồng nhất
 * (cao 48px, viền neutral-500 đạt tương phản ≥ 3:1, hover đậm viền).
 *
 * Các ô này là nút mở Popover (không phải `<input>`), nên dùng `Button` + class này. Trạng thái lỗi đọc từ
 * `data-invalid` (thay vì `aria-invalid`, vì `aria-invalid` không hợp lệ trên role `button`).
 */
export const fieldTriggerClass =
  "h-12 w-full justify-between gap-2 border border-neutral-500 bg-surface px-3 text-base font-normal text-ink hover:border-neutral-700 hover:bg-surface data-[invalid=true]:border-danger-700 aria-expanded:border-primary-700";

/** Nhãn phía trên mỗi ô; cao 20px + khoảng cách 6px = 1.625rem (để căn nút "Tìm" thẳng hàng với ô nhập). */
export const fieldLabelClass = "gap-1.5 text-sm leading-5 font-semibold text-ink";

/** Icon nhỏ cạnh nhãn. */
export const fieldLabelIconClass = "size-4 text-primary-700";

/** Chữ giữ chỗ khi ô chưa có giá trị (neutral-500 trên nền trắng đạt AA). */
export const placeholderClass = "text-neutral-500";
