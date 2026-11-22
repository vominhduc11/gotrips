import type { Destination } from "@/lib/types";
import { unsplash } from "./images";

/** Bảng `destinations`. `tourCount` KHÔNG lưu ở đây — được đếm từ tour ACTIVE trong lib/data. */
export const destinations: Destination[] = [
  {
    id: 1,
    slug: "da-lat",
    name: "Đà Lạt",
    region: "Tây Nguyên",
    imageUrl: unsplash("photo-1470071459604-3b5ec3a7fe05"),
    imageAlt: "Những ngọn đồi xanh phủ mây mỏng vùng cao nguyên",
  },
  {
    id: 2,
    slug: "phu-quoc",
    name: "Phú Quốc",
    region: "Miền Nam",
    imageUrl: unsplash("photo-1507525428034-b723cf961d3e"),
    imageAlt: "Bãi biển lúc bình minh, sóng nhẹ vỗ vào bờ cát",
  },
  {
    id: 3,
    slug: "ha-long",
    name: "Hạ Long",
    region: "Miền Bắc",
    imageUrl: unsplash("photo-1557750255-c76072a7aad1"),
    imageAlt: "Ngôi đình nhỏ bên hồ nước giữa những dãy núi đá vôi",
  },
  {
    id: 4,
    slug: "sapa",
    name: "Sapa",
    region: "Tây Bắc",
    imageUrl: unsplash("photo-1570366583862-f91883984fde"),
    imageAlt: "Ruộng bậc thang và bản làng nhìn từ trên cao",
  },
  {
    id: 5,
    slug: "hoi-an",
    name: "Hội An",
    region: "Miền Trung",
    imageUrl: unsplash("photo-1559592413-7cec4d0cae2b"),
    imageAlt: "Cầu Vàng trên đồi Bà Nà, Đà Nẵng",
  },
  {
    id: 6,
    slug: "nha-trang",
    name: "Nha Trang",
    region: "Miền Trung",
    imageUrl: unsplash("photo-1519046904884-53103b34b206"),
    imageAlt: "Bãi biển nhiệt đới với hàng dừa và ô che nắng",
  },
];
