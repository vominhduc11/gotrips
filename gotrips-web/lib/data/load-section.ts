import { io } from "next/cache";
import { unstable_rethrow } from "next/navigation";

/** Kết quả nạp dữ liệu cho một section: có dữ liệu, hoặc báo lỗi để section tự hiện trạng thái lỗi của nó. */
export type SectionResult<T> = { ok: true; data: T } | { ok: false };

/**
 * Nạp dữ liệu danh mục từ gotrips-api cho một khối của trang (section Trang chủ, danh sách/chi tiết tour...), gói lỗi lại
 * thành `{ ok: false }` để lỗi API chỉ làm hỏng ĐÚNG khối đó chứ không kéo sập cả trang. Gọi từ Server Component bọc
 * trong `<Suspense>`.
 *
 * `await io()` đặt trước mọi thứ: các hàm `lib/data/*` là `"use cache"` nên mặc định chạy luôn lúc `next build` để
 * điền static shell, tức build phải gọi được API (Docker build không có API → hỏng build). `<Suspense>` một mình không
 * ngăn được điều đó; `io()` mới là điểm dừng "prerender tới đây thôi", phần sau chỉ chạy khi có request thật. Fallback
 * của Suspense nằm trong static shell; còn ở runtime hàm `"use cache"` vẫn cache theo `cacheLife` của nó như cũ.
 *
 * Lỗi KHÔNG được cache: `lib/data/*` để lỗi ném ra thay vì trả mảng rỗng, và Next không ghi cache entry cho lần
 * gọi ném lỗi, nên lần request sau thử lại. Nếu cache `[]` khi API sập thì Trang chủ rỗng cả `cacheLife`.
 */
export async function loadSection<T>(name: string, load: () => Promise<T>): Promise<SectionResult<T>> {
  await io();
  try {
    return { ok: true, data: await load() };
  } catch (error) {
    // Lỗi nội bộ của Next (prerender bị ngắt, redirect, notFound...) phải đi tiếp; nuốt nó là coi như API lỗi
    // trong khi thực ra chỉ là lượt prerender bị dừng.
    unstable_rethrow(error);
    // Chỉ ghi nguyên nhân: không có dữ liệu người dùng ở đây, nhưng giữ cùng nguyên tắc với luồng đăng nhập.
    console.error(`[danh mục] Không tải được ${name}:`, describeError(error));
    return { ok: false };
  }
}

/**
 * Lỗi ném ra từ hàm `"use cache"` bị Next che nội dung ở production ("An error occurred in the Server Components
 * render...") và chỉ còn `digest`; nguyên nhân thật (ECONNREFUSED, timeout...) được Next ghi riêng ngay phía trên trong
 * log. Ghi kèm `digest` để đối chiếu hai dòng log với nhau.
 */
function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const digest = (error as Error & { digest?: unknown }).digest;
  return `${error.name}: ${error.message}${typeof digest === "string" ? ` (digest ${digest})` : ""}`;
}
