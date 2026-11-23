import { serviceTabHref } from "@/components/home/service-tab-hash";

export interface NavItem {
  label: string;
  /** Không có `href` = chưa dùng được (hiện nhãn "Sắp ra mắt", không bấm được). */
  href?: string;
  comingSoon?: boolean;
}

/** Menu chính — dùng chung cho Header (desktop) và MobileNav. */
export const NAV_ITEMS: NavItem[] = [
  { label: "Trang chủ", href: "/" },
  { label: "Tour du lịch", href: "/tours" },
  // Cuộn tới section "Điểm đến phổ biến" của Trang chủ (hoạt động từ mọi trang).
  { label: "Điểm đến", href: "/#diem-den" },
  // Chưa có trang /hotels, /flights: đưa về ô tìm kiếm Trang chủ với tab tương ứng được chọn sẵn
  // (hash ↔ tab nằm ở `service-tab-hash.ts`, `ServiceTabs` đọc hash để chọn tab).
  { label: "Khách sạn", href: serviceTabHref("hotel") },
  { label: "Vé máy bay", href: serviceTabHref("flight") },
];
