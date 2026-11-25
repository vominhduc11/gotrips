export interface NavItem {
  label: string;
  /** Không có `href` = chưa dùng được (hiện nhãn "Sắp ra mắt", không bấm được). */
  href?: string;
  comingSoon?: boolean;
}

/**
 * Menu chính — dùng chung cho Header (desktop) và MobileNav. Mỗi mục là một trang riêng; menu KHÔNG đụng tới tab
 * của ô tìm kiếm ở Trang chủ (tab đó do khách tự chọn, xem `components/home/ServiceTabs.tsx`).
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Trang chủ", href: "/" },
  { label: "Tour du lịch", href: "/tours" },
  { label: "Điểm đến", href: "/destinations" },
  { label: "Khách sạn", href: "/hotels" },
  { label: "Vé máy bay", href: "/flights" },
];
