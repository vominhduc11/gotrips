import type { FlightRoute } from "@/lib/types";
import { unsplash } from "./images";

/**
 * Bảng `flight_routes` — dữ liệu mock cho "Chặng bay phổ biến" (Trang chủ, `/flights`). Giá bán thật nằm ở
 * lịch bay (`flights.ts`); ảnh ở đây cũng làm ảnh minh hoạ cho đơn vé có cùng điểm đến.
 * `fromCode`/`toCode` là mã IATA, phải có trong `airports.ts` (có test kiểm tra). `referencePrice` chỉ là giá tham
 * khảo minh hoạ, không phải giá bán. Ảnh là ảnh tạm minh hoạ nơi đến — thay bằng ảnh có bản quyền trước khi ra mắt.
 */
export const flightRoutes: FlightRoute[] = [
  {
    id: 1,
    fromCode: "SGN",
    toCode: "HAN",
    durationMinutes: 125,
    referencePrice: 1390000,
    imageUrl: unsplash("photo-1555921015-5532091f6026"),
    imageAlt: "Con phố nhỏ có đường tàu chạy giữa hai dãy nhà, treo nhiều cờ đỏ sao vàng",
  },
  {
    id: 2,
    fromCode: "HAN",
    toCode: "SGN",
    durationMinutes: 125,
    referencePrice: 1350000,
    imageUrl: unsplash("photo-1583417319070-4a69db38a482"),
    imageAlt: "Các toà nhà cao tầng bên bờ sông lúc hoàng hôn",
  },
  {
    id: 3,
    fromCode: "SGN",
    toCode: "DAD",
    durationMinutes: 85,
    referencePrice: 990000,
    imageUrl: unsplash("photo-1559592413-7cec4d0cae2b"),
    imageAlt: "Cầu Vàng trên đồi Bà Nà, Đà Nẵng",
  },
  {
    id: 4,
    fromCode: "SGN",
    toCode: "PQC",
    durationMinutes: 60,
    referencePrice: 890000,
    imageUrl: unsplash("photo-1507525428034-b723cf961d3e"),
    imageAlt: "Bãi biển lúc bình minh, sóng nhẹ vỗ vào bờ cát",
  },
  {
    id: 5,
    fromCode: "SGN",
    toCode: "CXR",
    durationMinutes: 65,
    referencePrice: 790000,
    imageUrl: unsplash("photo-1519046904884-53103b34b206"),
    imageAlt: "Bãi biển nhiệt đới với hàng dừa và ô che nắng",
  },
  {
    id: 6,
    fromCode: "SGN",
    toCode: "DLI",
    durationMinutes: 55,
    referencePrice: 750000,
    imageUrl: unsplash("photo-1470071459604-3b5ec3a7fe05"),
    imageAlt: "Những ngọn đồi xanh phủ mây mỏng vùng cao nguyên",
  },
];
