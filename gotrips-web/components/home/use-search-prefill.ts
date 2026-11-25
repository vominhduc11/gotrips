"use client";

import { useEffect, useEffectEvent } from "react";
import type { z } from "zod";
import { subscribeHashNavigation } from "@/lib/hash-navigation";

/**
 * Cho một form tìm kiếm nhận dữ liệu điền sẵn khi khách bấm một thẻ gợi ý ("Khách sạn nổi bật", "Chặng bay phổ biến"
 * ở Trang chủ; danh sách ở `/hotels`, `/flights`). Thẻ là `AppLink` tới `<trang>#<hash>` kèm `hashPayload`; sự kiện
 * hash (xem `lib/hash-navigation.ts`) mang gói đó tới mọi form đang gắn trên trang, mỗi form chỉ nhận gói gửi tới
 * đúng `hash` của mình.
 *
 * - `hash` (không kèm `#`) là `id` của điểm đặt cuộn ngay trên form. Ở Trang chủ đó là hash của tab
 *   (`SERVICE_TAB_HASH`); ở `/hotels`, `/flights` là hash riêng của trang — phải KHÁC hash của Trang chủ, vì Trang chủ
 *   rời đi vẫn được Next giữ trong DOM (ẩn bằng `<Activity>`), trùng `id` thì cuộn nhầm sang phần tử đang ẩn.
 * - Gói là dữ liệu KHÔNG TIN CẬY nên phải qua `schema` (Zod) trước khi `apply`; không hợp lệ thì bỏ qua hoàn toàn.
 *   Điều hướng không có gói (gõ tay hash, Back/Forward) cũng bị bỏ qua, tức là không bao giờ xoá hay ghi đè gì của khách.
 * - `apply` chỉ nên `setValue` đúng những ô của gói, không `reset()`: ô khách đã nhập phải được giữ nguyên.
 * - `useEffectEvent` để `apply`/`schema` luôn là bản mới nhất (vd `update()` đọc `isSubmitted` hiện tại) mà không
 *   phải huỷ/đăng ký lại sự kiện mỗi lần form render.
 */
export function useSearchPrefill<T>({
  hash,
  schema,
  apply,
}: {
  hash: string;
  schema: z.ZodType<T>;
  apply: (values: T) => void;
}) {
  const onNavigate = useEffectEvent((navigatedHash: string, payload: unknown) => {
    if (payload === undefined || navigatedHash !== `#${hash}`) return;
    const parsed = schema.safeParse(payload);
    if (parsed.success) apply(parsed.data);
  });

  // Bọc bằng hàm mới thay vì truyền thẳng `onNavigate`: Effect Event chỉ được gọi bên trong effect.
  useEffect(() => subscribeHashNavigation((navigatedHash, payload) => onNavigate(navigatedHash, payload)), []);
}
