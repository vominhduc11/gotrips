"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { announceHashNavigation, getHashFromHref, scrollToHashTarget } from "@/lib/hash-navigation";

/**
 * `next/link` với `prefetch={false}` mặc định, và tự báo hash đích khi điều hướng client-side.
 *
 * - Ở giai đoạn prototype một số đích đến (vd /tours/[slug]) CHƯA tồn tại; Next prefetch ở production
 *   sẽ bắn request 404 vào console. Khi các trang đã có, bỏ default này (hoặc truyền `prefetch` tường minh).
 * - Link tới `/#tim-khach-san`... không tạo ra `hashchange` (Next dùng `pushState`), nên component đang hiển thị
 *   không biết hash đã đổi. `onNavigate` (chỉ chạy khi điều hướng client-side, và chạy trước khi URL đổi) phát sự kiện
 *   kèm hash lấy từ `href` — xem `lib/hash-navigation.ts`. Cần "use client" vì phải truyền hàm xuống `Link`.
 * - Next chỉ cuộn tới hash khi hash ĐỔI so với URL hiện tại. Bấm liên kết có đúng hash đang nằm trên URL (thẻ thứ hai
 *   cùng loại, mục Footer sau khi đã ở `/#tim-khach-san`...) thì ở đây tự cuộn bằng `scrollToHashTarget`.
 * - `hashPayload`: gói dữ liệu đi kèm sự kiện hash (vd điền sẵn ô tìm kiếm khi bấm thẻ khách sạn). Chỉ có tác dụng khi
 *   `href` có hash, và phải là dữ liệu thuần (object/chuỗi/số) vì được truyền từ Server Component sang đây. Nơi nhận
 *   coi nó là dữ liệu không tin cậy và tự kiểm tra.
 */
export function AppLink({
  prefetch = false,
  href,
  onNavigate,
  hashPayload,
  ...props
}: ComponentProps<typeof Link> & { hashPayload?: unknown }) {
  return (
    <Link
      prefetch={prefetch}
      href={href}
      onNavigate={(event) => {
        // Tôn trọng `onNavigate` của nơi gọi: nếu nó huỷ điều hướng thì không báo hash.
        let prevented = false;
        onNavigate?.({
          preventDefault: () => {
            prevented = true;
            event.preventDefault();
          },
        });
        const hash = getHashFromHref(href);
        if (prevented || !hash) return;
        // `onNavigate` chạy trước khi router đổi URL nên `location.hash` lúc này vẫn là hash CŨ: trùng hash đích nghĩa
        // là Next sẽ coi đây là "không đổi hash" và không cuộn, ta tự cuộn thay. Tôn trọng `scroll={false}`.
        if (props.scroll !== false && hash === window.location.hash) scrollToHashTarget(hash);
        announceHashNavigation(hash, hashPayload);
      }}
      {...props}
    />
  );
}
