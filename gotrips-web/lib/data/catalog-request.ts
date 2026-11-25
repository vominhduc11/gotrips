/**
 * Tuỳ chọn `fetch` cho các lời gọi API danh mục của Trang chủ.
 *
 * `http.ts` mặc định chờ 10 giây, quá dài cho một section của Trang chủ: API treo thì khách nhìn khung chờ cả 10 giây
 * (rồi còn nhân lên theo số section chờ song song). Dữ liệu ở đây là phần phụ của trang, nên thà bỏ cuộc sớm và hiện
 * trạng thái lỗi cục bộ (xem `loadSection`) còn hơn kéo dài.
 *
 * Phải tạo `AbortSignal` MỚI cho mỗi lời gọi (không dùng chung một hằng số): signal đã hết hạn thì mọi lời gọi sau
 * đó bị huỷ ngay. `http.ts` tự gộp signal này với timeout mặc định của nó (cái nào tới trước thắng).
 */
export const CATALOG_TIMEOUT_MS = 3_000;

export function catalogRequestInit(): RequestInit {
  return { signal: AbortSignal.timeout(CATALOG_TIMEOUT_MS) };
}
