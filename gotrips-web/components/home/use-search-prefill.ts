"use client";

import { useEffect, useEffectEvent } from "react";
import type { z } from "zod";
import { subscribeHashNavigation } from "@/lib/hash-navigation";
import { serviceTabFromHash, type ServiceTab } from "./service-tab-hash";

/**
 * Cho một form tìm kiếm của `ServiceTabs` nhận dữ liệu điền sẵn khi khách bấm một thẻ ở thân Trang chủ
 * ("Khách sạn nổi bật", "Chặng bay phổ biến"). Thẻ là `AppLink` tới `/#<hash của tab>` kèm `hashPayload`; sự kiện
 * hash (xem `lib/hash-navigation.ts`) mang gói đó tới mọi form đang gắn trên trang, mỗi form chỉ nhận gói của tab mình.
 *
 * - Chỉ xử lý khi hash đích đúng là tab của form (`serviceTabFromHash`, không viết lại chuỗi hash ở đây).
 * - Gói là dữ liệu KHÔNG TIN CẬY nên phải qua `schema` (Zod) trước khi `apply`; không hợp lệ thì bỏ qua hoàn toàn
 *   (tab vẫn được `ServiceTabs` chọn như bình thường). Điều hướng không có gói (menu Header, Footer, hashchange gốc)
 *   cũng bị bỏ qua ở đây, tức là không bao giờ xoá hay ghi đè gì của khách.
 * - `apply` chỉ nên `setValue` đúng những ô của gói, không `reset()`: ô khách đã nhập phải được giữ nguyên.
 * - `useEffectEvent` để `apply`/`schema` luôn là bản mới nhất (vd `update()` đọc `isSubmitted` hiện tại) mà không
 *   phải huỷ/đăng ký lại sự kiện mỗi lần form render.
 */
export function useSearchPrefill<T>({
  tab,
  schema,
  apply,
}: {
  tab: ServiceTab;
  schema: z.ZodType<T>;
  apply: (values: T) => void;
}) {
  const onNavigate = useEffectEvent((hash: string, payload: unknown) => {
    if (payload === undefined || serviceTabFromHash(hash) !== tab) return;
    const parsed = schema.safeParse(payload);
    if (parsed.success) apply(parsed.data);
  });

  // Bọc bằng hàm mới thay vì truyền thẳng `onNavigate`: Effect Event chỉ được gọi bên trong effect.
  useEffect(() => subscribeHashNavigation((hash, payload) => onNavigate(hash, payload)), []);
}
