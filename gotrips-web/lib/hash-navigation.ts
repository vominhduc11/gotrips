/**
 * Báo cho component client biết "vừa có điều hướng tới hash này", kể cả khi đang ở sẵn đúng trang đó — và, nếu nơi
 * bấm muốn, kèm một gói dữ liệu (`payload`) đi cùng.
 *
 * Vì sao cần: `next/link` luôn `preventDefault()` rồi điều hướng bằng router (`history.pushState` do chính Next gọi),
 * mà `pushState` KHÔNG phát `hashchange`/`popstate`. Next cũng không có sự kiện công khai nào cho điều hướng chỉ đổi
 * hash, và hash-only navigation không render lại các Client Component bên trong trang. Hai cách còn lại đều kém:
 *  - vá `history.pushState`: Next đã vá chính hàm này và gỡ bản vá của nó khi cleanup, hai bên dễ giẫm lên nhau;
 *  - `useSearchParams`: buộc `<Suspense>`/làm mất static shell của Trang chủ (`cacheComponents`).
 * Nên dùng `onNavigate` — prop chính thức của `Link`, chỉ chạy khi điều hướng client-side — để `AppLink` tự phát một
 * sự kiện kèm hash đích. Điều hướng không đi qua `AppLink` (gõ tay hash, nút Back/Forward giữa hai hash) vẫn có
 * `hashchange` gốc của trình duyệt, nên `subscribeHashNavigation` nghe cả hai.
 *
 * Hash lấy từ `href` chứ không đọc `window.location.hash`: `onNavigate` chạy TRƯỚC khi router đổi URL.
 *
 * Về `payload` (thẻ "Khách sạn nổi bật"/"Chặng bay phổ biến" điền sẵn ô tìm kiếm): có hai cách đưa giá trị tới form —
 * (a) kèm vào sự kiện này, hoặc (b) nhét tham số vào hash (`#tim-khach-san?destination=da-lat`). Chọn (a) vì:
 *  - hash giữ nguyên ba giá trị sạch ở `service-tab-hash.ts`. Next cuộn bằng `getElementById(hash)`, nên hash có
 *    thêm tham số sẽ không khớp `id` nào → mất cuộn; `serviceTabFromHash` (so khớp chính xác) cũng phải nới lỏng;
 *  - không ghi dữ liệu lên URL: tải lại trang hay chia sẻ liên kết không điền lại giá trị cũ, và không phát sinh
 *    thêm một "hợp đồng URL" nữa phải duy trì;
 *  - thẻ và ô tìm kiếm luôn nằm cùng Trang chủ nên sự kiện trong trang là đủ. (Bấm thẻ TRƯỚC khi hydrate thì trình
 *    duyệt tải lại trang: tab vẫn được chọn theo hash, chỉ mất phần điền sẵn.)
 * `hashchange` gốc không có payload. Payload là dữ liệu KHÔNG TIN CẬY (bất kỳ script nào cũng phát được sự kiện này):
 * nơi nhận phải tự kiểm tra (Zod) rồi mới dùng, xem `components/home/use-search-prefill.ts`.
 */

export const HASH_NAVIGATION_EVENT = "gotrips:hash-navigation";

/** Dữ liệu đi kèm `HASH_NAVIGATION_EVENT`. */
interface HashNavigationDetail {
  hash: string;
  payload?: unknown;
}

/** Kiểu `href` của `next/link` (chuỗi hoặc `UrlObject`), chỉ giữ phần cần dùng. */
type HrefLike = string | { hash?: string | null };

/** Hash của `href` theo dạng `window.location.hash` (có `#` đứng đầu); không có hash thì trả `""`. */
export function getHashFromHref(href: HrefLike): string {
  let raw: string;
  if (typeof href === "string") {
    const index = href.indexOf("#");
    raw = index === -1 ? "" : href.slice(index);
  } else {
    raw = href.hash ?? "";
  }
  if (raw === "" || raw === "#") return "";
  return raw.startsWith("#") ? raw : `#${raw}`;
}

/**
 * Cuộn tới phần tử có `id` bằng hash (có hoặc không có `#`); không có phần tử nào thì không làm gì.
 * `scroll-margin-top` của phần tử đích (vd `scroll-mt-20` chừa chỗ cho header dính) vẫn được tôn trọng.
 *
 * Vì sao cần: Next chỉ cuộn khi hash ĐỔI so với URL hiện tại (`onlyHashChange = url.hash !== oldUrl.hash` trong
 * `completeSoftNavigation`). Bấm tiếp một liên kết tới đúng hash đang có trên URL (vd URL đã là `/#tim-khach-san`,
 * khách cuộn xuống rồi bấm thẻ khách sạn thứ hai hay mục Footer "Khách sạn") thì Next không cuộn gì, dù tab vẫn được
 * chọn. `AppLink` gọi hàm này đúng trong trường hợp đó.
 */
export function scrollToHashTarget(hash: string): void {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (raw === "") return;
  let id = raw;
  try {
    // Next cũng giải mã hash trước khi tìm phần tử (để hash có chữ Việt/không phải ASCII vẫn cuộn được).
    id = decodeURIComponent(raw);
  } catch {
    // Hash có `%` hỏng (vd `#100%`): dùng nguyên chuỗi, giống trình duyệt.
  }
  document.getElementById(id)?.scrollIntoView();
}

/** Phát sự kiện cho `subscribeHashNavigation`, có thể kèm `payload`. Chỉ gọi ở phía client. */
export function announceHashNavigation(hash: string, payload?: unknown): void {
  window.dispatchEvent(
    new CustomEvent<HashNavigationDetail>(HASH_NAVIGATION_EVENT, { detail: { hash, payload } }),
  );
}

/**
 * Nghe mọi điều hướng hash: sự kiện của `AppLink` và `hashchange` gốc. `listener` nhận hash dạng `#...`, và đối số
 * thứ hai chỉ có khi nơi phát có kèm payload (không có thì `listener` chỉ nhận đúng một đối số).
 * Trả về hàm huỷ đăng ký (dùng làm cleanup của effect).
 */
export function subscribeHashNavigation(listener: (hash: string, payload?: unknown) => void): () => void {
  const onAnnounce = (event: Event) => {
    const { hash, payload } = (event as CustomEvent<HashNavigationDetail>).detail;
    if (payload === undefined) listener(hash);
    else listener(hash, payload);
  };
  // Lúc `hashchange` bắn thì URL đã đổi xong nên đọc thẳng `location.hash` là đúng.
  const onHashChange = () => listener(window.location.hash);

  window.addEventListener(HASH_NAVIGATION_EVENT, onAnnounce);
  window.addEventListener("hashchange", onHashChange);
  return () => {
    window.removeEventListener(HASH_NAVIGATION_EVENT, onAnnounce);
    window.removeEventListener("hashchange", onHashChange);
  };
}
