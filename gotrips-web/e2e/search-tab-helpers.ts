import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Hàm dùng chung cho các spec kiểm tra ô tìm kiếm Trang chủ (3 tab) và việc cuộn/chọn tab theo hash:
 * `service-nav.spec.ts` (menu Header, hash chọn tab), `home-services.spec.ts` (thẻ khách sạn/chặng bay, Footer) và
 * `service-pages.spec.ts` (trang /destinations, /hotels, /flights).
 * Không có đuôi `.spec` nên Playwright không coi đây là file test.
 */

/** Chiều cao header dính (h-16). */
export const HEADER_HEIGHT = 64;

/** Mở Trang chủ và đợi hydrate xong (cùng dấu hiệu với e2e/home.spec.ts: ô ẩn `guests` của form tìm tour được RHF điền "2"). */
export async function gotoHome(page: Page, path = "/") {
  await page.goto(path);
  await expect(page.locator('form[aria-label="Tìm tour"] input[name="guests"]')).toHaveValue("2");
}

/**
 * Đợi React hydrate một liên kết (chọn bằng `selector`). Thuộc tính nội bộ `__reactProps$…` được React gắn lên phần tử
 * DOM đúng lúc hydrate nó. Cần thiết vì bấm liên kết TRƯỚC khi hydrate thì trình duyệt tải lại cả trang (MPA) và test
 * sẽ không kiểm tra được điều hướng client-side — đường mà người dùng thật luôn đi, vì họ chỉ bấm được sau khi trang
 * đã hydrate.
 */
export async function waitForLinkHydrated(page: Page, selector: string) {
  await page.waitForFunction((sel) => {
    const link = document.querySelector(sel);
    return link !== null && Object.keys(link).some((key) => key.startsWith("__reactProps$"));
  }, selector);
}

/** Đợi hydrate phần Header của một trang bất kỳ (không có ô nhập nào để dựa vào như Trang chủ). */
export async function waitForHeaderHydrated(page: Page) {
  await waitForLinkHydrated(page, 'header a[href="/tours"]');
}

/** Đánh dấu `window` để sau này biết trang có bị tải lại hay không (tải lại thì dấu mất). */
export async function markPage(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { __khongTaiLai: boolean }).__khongTaiLai = true;
  });
}

export async function expectNotReloaded(page: Page) {
  const marker = await page.evaluate(() => (window as unknown as { __khongTaiLai?: boolean }).__khongTaiLai);
  expect(marker, "trang bị tải lại — điều hướng phải là client-side").toBe(true);
}

/** Tab đã được chọn, đang giữ focus, và nằm trong màn hình, ngay dưới header (không bị header dính che). */
export async function expectTabSelectedAndVisible(page: Page, tab: Locator) {
  await expect(tab).toHaveAttribute("aria-selected", "true");
  await expect(tab).toBeFocused();
  await expect(tab).toBeInViewport();
  // Đã cuộn tới ô tìm kiếm (không còn ở vị trí cũ), và mép trên không nằm dưới header. Dùng poll vì cuộn có thể chưa xong.
  await expect
    .poll(async () => (await tab.boundingBox())?.y ?? -1, { message: "tab phải nằm ngay dưới header" })
    .toBeGreaterThanOrEqual(HEADER_HEIGHT);
  await expect
    .poll(async () => (await tab.boundingBox())?.y ?? Number.POSITIVE_INFINITY, { message: "đã cuộn tới ô tìm kiếm" })
    .toBeLessThan(HEADER_HEIGHT + 120);
}
