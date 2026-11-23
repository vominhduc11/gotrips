import type { Hotel } from "@/lib/types";
import { unsplash } from "./images";

/**
 * Bảng `hotels` — dữ liệu THỬ NGHIỆM cho section "Khách sạn nổi bật" (chưa có trang /hotels, chưa đặt phòng được).
 * `destinationId` trỏ tới `destinations.ts`. Tên khách sạn là tên giả. Ảnh là ảnh tạm (khu nghỉ dưỡng chung chung,
 * không phải ảnh thật của khách sạn hay địa danh) — thay bằng ảnh có bản quyền trước khi ra mắt; `imageAlt` mô tả
 * đúng nội dung ảnh hiện có.
 *
 * Có một khách sạn `HIDDEN` (id 8) để kiểm tra luật "khách sạn bị ẩn không được hiển thị".
 */
export const hotels: Hotel[] = [
  {
    id: 1,
    slug: "khach-san-doi-may-da-lat",
    name: "Khách sạn Đồi Mây",
    destinationId: 1, // Đà Lạt
    starRating: 4,
    area: "Phường 3, Đà Lạt",
    imageUrl: unsplash("photo-1566073771259-6a8506099945"),
    imageAlt: "Khu nghỉ dưỡng mái ngói gỗ bên hồ bơi lúc hoàng hôn",
    status: "ACTIVE",
    rating: 4.6,
    reviewCount: 1280,
  },
  {
    id: 2,
    slug: "villa-thong-xanh-da-lat",
    name: "Villa Thông Xanh",
    destinationId: 1, // Đà Lạt
    starRating: 3,
    area: "Phường 9, Đà Lạt",
    imageUrl: unsplash("photo-1455587734955-081b22074882"),
    imageAlt: "Mặt tiền khách sạn nhiều ban công, trước nhà có hàng cọ",
    status: "ACTIVE",
    rating: 4.3,
    reviewCount: 640,
  },
  {
    id: 3,
    slug: "resort-bai-sao-phu-quoc",
    name: "Resort Bãi Sao",
    destinationId: 2, // Phú Quốc
    starRating: 5,
    area: "Bãi Sao, Phú Quốc",
    imageUrl: unsplash("photo-1582719508461-905c673771fd"),
    imageAlt: "Hồ bơi sát biển với ghế dài và dù che nắng trên sàn gỗ",
    status: "ACTIVE",
    rating: 4.8,
    reviewCount: 2150,
  },
  {
    id: 4,
    slug: "khach-san-hoang-hon-phu-quoc",
    name: "Khách sạn Hoàng Hôn",
    destinationId: 2, // Phú Quốc
    starRating: 4,
    area: "Dương Đông, Phú Quốc",
    imageUrl: unsplash("photo-1551882547-ff40c63fe5fa"),
    imageAlt: "Toà nhà màu trắng và hàng cọ dưới bầu trời hoàng hôn",
    status: "ACTIVE",
    rating: 4.5,
    reviewCount: 930,
  },
  {
    id: 5,
    slug: "khach-san-vinh-xanh-ha-long",
    name: "Khách sạn Vịnh Xanh",
    destinationId: 3, // Hạ Long
    starRating: 4,
    area: "Bãi Cháy, Hạ Long",
    imageUrl: unsplash("photo-1520250497591-112f2f40a3f4"),
    imageAlt: "Hồ bơi giữa vườn cọ, phía xa là dãy núi đá",
    status: "ACTIVE",
    rating: 4.4,
    reviewCount: 780,
  },
  {
    id: 6,
    slug: "khach-san-may-ngan-sapa",
    name: "Khách sạn Mây Ngàn",
    destinationId: 4, // Sapa
    starRating: 3,
    area: "Thị xã Sa Pa, Lào Cai",
    imageUrl: unsplash("photo-1542314831-068cd1dbfeeb"),
    imageAlt: "Sảnh kính sáng đèn bên hồ bơi lúc trời tối",
    status: "ACTIVE",
    rating: 4.2,
    reviewCount: 410,
  },
  {
    id: 7,
    slug: "khach-san-pho-hoa-dang-hoi-an",
    name: "Khách sạn Phố Hoa Đăng",
    destinationId: 5, // Hội An
    starRating: 4,
    area: "Phường Minh An, Hội An",
    imageUrl: unsplash("photo-1564501049412-61c2a3083791"),
    imageAlt: "Toà nhà kiểu cổ điển màu trắng bên hồ bơi lúc chạng vạng",
    status: "ACTIVE",
    rating: 4.7,
    reviewCount: 1560,
  },
  {
    id: 8,
    slug: "resort-bien-xanh-nha-trang",
    name: "Resort Biển Xanh",
    destinationId: 6, // Nha Trang
    starRating: 5,
    area: "Trần Phú, Nha Trang",
    imageUrl: unsplash("photo-1571896349842-33c89424de2d"),
    imageAlt: "Hồ bơi lát gạch xanh về đêm, phía sau là sảnh kính",
    // Đang ẩn: không được hiện ở Trang chủ dù có điểm cao và có phòng.
    status: "HIDDEN",
    rating: 4.9,
    reviewCount: 3020,
  },
];
