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
  { label: "Khách sạn", comingSoon: true },
  { label: "Vé máy bay", comingSoon: true },
];
