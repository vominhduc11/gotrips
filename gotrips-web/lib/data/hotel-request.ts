import type { SearchHotelsParams } from "@/lib/api/generated/model";
import type { HotelSearchValues } from "@/lib/schemas/hotel-search";

/**
 * Lượt tìm của trang /hotels (đã qua `parseHotelSearchParams`) → tham số của `GET /hotels`. Tên tham số trùng với URL của
 * web nên chỉ cần chọn đúng các trường; API tự kiểm lại mọi luật (ngày, số đêm, số phòng ≤ số khách) bằng cùng thông báo.
 */
export function toSearchHotelsParams(query: HotelSearchValues): SearchHotelsParams {
  return {
    destination: query.destination,
    checkIn: query.checkIn,
    checkOut: query.checkOut,
    guests: query.guests,
    rooms: query.rooms,
  };
}

/** Cùng luật với ràng buộc của cột `hotels.slug` ở DB (chữ thường/số, nối bằng gạch, tối đa 150 ký tự). */
const HOTEL_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HOTEL_SLUG_MAX_LENGTH = 150;
/**
 * Đoạn đường dẫn đã có endpoint riêng ở API (`GET /hotels/featured`): gọi `/hotels/featured` KHÔNG trả 404 mà trả danh
 * sách khách sạn nổi bật (sai hình dạng so với chi tiết), nên slug này không bao giờ là một khách sạn.
 */
const RESERVED_HOTEL_SLUGS: ReadonlySet<string> = new Set(["featured"]);

/**
 * Slug lấy từ URL là dữ liệu không tin cậy. Client do Orval sinh ghép thẳng `/hotels/${slug}` mà không mã hoá, nên slug
 * như `../auth/me` hay `a/b` sẽ gọi sang endpoint khác (rồi trả dữ liệu sai hình dạng), và `featured` sẽ rơi vào endpoint
 * danh sách. Slug sai định dạng thì chắc chắn không có khách sạn nào: trả 404 ngay, khỏi gọi API.
 */
export function isValidHotelSlug(slug: string): boolean {
  return slug.length <= HOTEL_SLUG_MAX_LENGTH && HOTEL_SLUG_PATTERN.test(slug) && !RESERVED_HOTEL_SLUGS.has(slug);
}
