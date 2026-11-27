/**
 * Phần dùng chung của ba Server Action tạo đơn (tour, khách sạn, vé máy bay). KHÔNG đặt `"use server"`: file đó chỉ được
 * export hàm async và mọi export đều thành endpoint công khai.
 */
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { ApiError } from "@/lib/api/http";
import { getSessionToken } from "@/lib/auth/session";
import { buildLoginHref } from "@/lib/safe-redirect";
import { fromApiFieldErrors } from "./field-errors";
import { SERVICE_UNAVAILABLE_MESSAGE } from "./messages";

/** Kết quả trả về form đặt chỗ; lỗi theo field được form gắn lại vào đúng ô (hoặc hiện ở đầu form). */
export type BookingActionResult =
  | { ok: true; code: string; redirectTo: string }
  | { ok: false; message?: string; fieldErrors?: Record<string, string> };

/**
 * Gọi API tạo đơn bằng token của phiên. Chưa đăng nhập hoặc token hết hạn (401) → chuyển tới đăng nhập kèm `next` là
 * trang đang đặt, đăng nhập xong quay lại đúng chỗ. Lỗi khác:
 *  - 400/409 kèm `errors[]` → gắn vào field form có (`isFormField`); field lạ thì dùng câu `detail` của API;
 *  - mạng, hết thời gian chờ, 5xx... → "Hệ thống đang bận…".
 * Thành công thì làm mới cache của `staleTags` (số chỗ/phòng/ghế đã đổi) rồi trả mã đơn.
 */
export async function submitBooking({
  create,
  loginNext,
  isFormField,
  staleTags,
  label,
}: {
  create: (token: string) => Promise<{ code: string }>;
  loginNext: string;
  isFormField: (field: string) => boolean;
  staleTags: readonly string[];
  /** Tên luồng cho log (không chứa dữ liệu người dùng). */
  label: string;
}): Promise<BookingActionResult> {
  const token = await getSessionToken();
  if (!token) redirect(buildLoginHref(loginNext));

  let code: string;
  try {
    ({ code } = await create(token));
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect(buildLoginHref(loginNext));
    if (error instanceof ApiError && (error.status === 400 || error.status === 409)) {
      const fieldErrors = fromApiFieldErrors(error.errors, isFormField);
      if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
      return { ok: false, message: error.detail ?? error.title };
    }
    // Không ghi dữ liệu người dùng hay token vào log, chỉ ghi nguyên nhân.
    console.error(`[đặt chỗ] ${label} thất bại:`, error instanceof Error ? `${error.name}: ${error.message}` : error);
    return { ok: false, message: SERVICE_UNAVAILABLE_MESSAGE };
  }

  refreshAfterBooking(staleTags);
  return { ok: true, code, redirectTo: `/bookings/${code}` };
}

/**
 * Làm mới cache dữ liệu có số chỗ/phòng/ghế sau khi đặt thành công.
 *
 * Gọi trong `after()` CHỨ KHÔNG gọi thẳng `updateTag`/`revalidateTag` trong action: hai hàm đó (với hạn 0) khiến phản
 * hồi của action render lại trang ĐANG MỞ (trang đặt chỗ) với dữ liệu mới. Khi vừa đặt hết chỗ, phần kiểm "còn đặt
 * được" của trang đó sẽ tự chuyển hướng, tranh với việc form đưa khách sang trang đơn. `after()` chạy sau khi phản hồi
 * đã gửi nên không render lại trang nào; `{ expire: 0 }` để lượt đọc kế tiếp phải lấy dữ liệu mới (không trả bản cũ).
 */
function refreshAfterBooking(tags: readonly string[]) {
  after(() => {
    for (const tag of tags) revalidateTag(tag, { expire: 0 });
  });
}
