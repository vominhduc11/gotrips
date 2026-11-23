/**
 * Ánh xạ DUY NHẤT giữa tab dịch vụ của ô tìm kiếm Trang chủ và hash trên URL.
 *
 * Menu Header (`nav-items.ts`), điểm đặt id cuộn (`HeroSearch`) và `ServiceTabs` đều lấy từ đây, để đổi một
 * hash chỉ phải sửa một chỗ. File này không có "use client" và không đụng tới `window` nên Server Component
 * cũng import được.
 */

export const SERVICE_TABS = ["tour", "hotel", "flight"] as const;

export type ServiceTab = (typeof SERVICE_TABS)[number];

export const DEFAULT_SERVICE_TAB: ServiceTab = "tour";

/** Hash (không kèm `#`) của từng tab. Cũng chính là `id` của điểm đặt cuộn ở đầu ô tìm kiếm. */
export const SERVICE_TAB_HASH: Record<ServiceTab, string> = {
  tour: "tim-tour",
  hotel: "tim-khach-san",
  flight: "tim-ve-may-bay",
};

/**
 * `href` tới ô tìm kiếm Trang chủ với tab đó được chọn sẵn (`/#tim-khach-san`...). Menu Header, Footer và các thẻ
 * "Khách sạn nổi bật"/"Chặng bay phổ biến" đều dùng hàm này, nên chuỗi hash chỉ tồn tại ở file này.
 */
export function serviceTabHref(tab: ServiceTab): string {
  return `/#${SERVICE_TAB_HASH[tab]}`;
}

export function isServiceTab(value: string): value is ServiceTab {
  return (SERVICE_TABS as readonly string[]).includes(value);
}

/**
 * Tab ứng với một hash (có hoặc không có `#` đứng đầu). Không khớp tab nào → `null`.
 *
 * So khớp chính xác, phân biệt hoa/thường, giống cách trình duyệt tìm phần tử theo `id`; tra bằng vòng lặp thay vì
 * `obj[hash]` để các hash như `#constructor` hay `#__proto__` không vô tình khớp thuộc tính của `Object`.
 */
export function serviceTabFromHash(hash: string): ServiceTab | null {
  const id = hash.startsWith("#") ? hash.slice(1) : hash;
  return SERVICE_TABS.find((tab) => SERVICE_TAB_HASH[tab] === id) ?? null;
}
