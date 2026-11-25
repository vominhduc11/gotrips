import { SearchToursSort, type SearchToursParams } from "@/lib/api/generated/model";
import type { TourFilters, TourSort } from "@/lib/schemas/tour-filters";

/**
 * Giá trị `sort` trên URL của web (tiếng Việt, đẹp cho người dùng) → giá trị của API. Khai kiểu `Record` đầy đủ nên
 * thêm/bớt kiểu sắp xếp ở một bên mà quên bên kia thì TypeScript báo lỗi lúc build.
 */
const API_SORT: Record<TourSort, SearchToursSort> = {
  "noi-bat": SearchToursSort.FEATURED,
  "ngay-gan": SearchToursSort.NEAREST_DEPARTURE,
  "gia-tang": SearchToursSort.PRICE_ASC,
  "gia-giam": SearchToursSort.PRICE_DESC,
  "danh-gia": SearchToursSort.RATING,
};

/** Bộ lọc của trang /tours (đã qua `parseTourFilters`) → tham số của `GET /tours`. Trường vắng mặt thì không gửi. */
export function toSearchToursParams(filters: TourFilters): SearchToursParams {
  return {
    destination: filters.destination,
    q: filters.q,
    date: filters.date,
    guests: filters.guests,
    sort: API_SORT[filters.sort],
    page: filters.page,
  };
}

/** Cùng luật với ràng buộc của cột `tours.slug` ở DB (chữ thường/số, nối bằng gạch, tối đa 150 ký tự). */
const TOUR_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TOUR_SLUG_MAX_LENGTH = 150;
/**
 * Đoạn đường dẫn đã có endpoint riêng ở API (`GET /tours/featured`): gọi `/tours/featured` KHÔNG trả 404 mà trả danh sách
 * tour nổi bật (sai hình dạng so với chi tiết tour), nên slug này không bao giờ là một tour.
 */
const RESERVED_TOUR_SLUGS: ReadonlySet<string> = new Set(["featured"]);

/**
 * Slug lấy từ URL là dữ liệu không tin cậy. Client do Orval sinh ghép thẳng `/tours/${slug}` mà không mã hoá, nên slug như
 * `../destinations` hay `a/b` sẽ gọi sang endpoint khác của API (rồi trả dữ liệu sai hình dạng), và `featured` sẽ rơi vào
 * endpoint danh sách. Slug sai định dạng thì chắc chắn không có tour nào: trả 404 ngay, khỏi gọi API.
 */
export function isValidTourSlug(slug: string): boolean {
  return slug.length <= TOUR_SLUG_MAX_LENGTH && TOUR_SLUG_PATTERN.test(slug) && !RESERVED_TOUR_SLUGS.has(slug);
}
