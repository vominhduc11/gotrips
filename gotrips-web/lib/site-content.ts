import type { HeroBanner } from "@/lib/types";

/**
 * Nội dung cấu hình của website (không phải dữ liệu nghiệp vụ của gotrips-api). Sau này nếu admin quản lý banner thì
 * chuyển sang API.
 */

/**
 * Ảnh nền hero của Trang chủ (ảnh rộng, tải lớn hơn để không bị mờ trên màn hình lớn); cũng là ảnh mặc định của đơn vé
 * khi điểm đến không có ảnh. Hiện là ảnh Unsplash tạm (host đã khai ở `images.remotePatterns` của next.config.ts):
 * phải thay bằng ảnh thật/có bản quyền của GoTrips trước khi ra mắt.
 */
export const HERO_BANNER: HeroBanner = {
  imageUrl: "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=2400&q=75",
  imageAlt: "Du thuyền nhỏ trên vịnh Hạ Long giữa những hòn đảo đá vôi",
};
