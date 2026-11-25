import { expect, test, type Page } from "@playwright/test";
import { expectNotReloaded, markPage, waitForHeaderHydrated } from "./search-tab-helpers";

/**
 * Trang riêng của các mục menu: /destinations, /hotels, /flights (dữ liệu mock). Khi chưa tìm: /hotels có ô tìm kiếm +
 * khách sạn gợi ý (bấm thẻ mở trang chi tiết); /flights có ô tìm vé + chặng bay phổ biến (bấm thẻ điền sẵn ô tìm kiếm
 * NGAY TRÊN TRANG đó). Kết quả tìm kiếm và luồng đặt nằm ở hotel-booking.spec.ts / flight-booking.spec.ts.
 *
 * Dữ liệu mock (lib/mock/*): 6 điểm đến; 8 khách sạn, trong đó "Resort Biển Xanh" (Nha Trang) là HIDDEN → hiện 7;
 * 6 chặng bay.
 */

const VIEWPORTS = [
  { name: "desktop", viewport: { width: 1280, height: 720 } },
  { name: "điện thoại", viewport: { width: 390, height: 844 } },
] as const;

/** Mở trang và đợi hydrate (liên kết Header + form đã gắn sự kiện). */
async function gotoPage(page: Page, path: string, cardSelector: string) {
  await page.goto(path);
  await waitForHeaderHydrated(page);
  // Thẻ là liên kết client (`AppLink`): bấm trước khi hydrate thì trình duyệt tải lại cả trang.
  await page.waitForFunction(
    (sel) => {
      const link = document.querySelector(sel);
      return link !== null && Object.keys(link).some((key) => key.startsWith("__reactProps$"));
    },
    cardSelector,
  );
}

/** Không có thanh cuộn ngang. */
async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

for (const { name, viewport } of VIEWPORTS) {
  test.describe(`trang dịch vụ (${name})`, () => {
    test.use({ viewport });

    test("/destinations: breadcrumb, h1, 6 điểm đến; bấm thẻ mở /tours đã lọc", async ({ page }) => {
      await gotoPage(page, "/destinations", 'main a[href="/tours?destination=da-lat"]');
      await markPage(page);

      await expect(page.getByRole("heading", { level: 1, name: "Điểm đến", exact: true })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "breadcrumb" })).toContainText("Trang chủ");
      const cards = page.locator('main a[href^="/tours?destination="]');
      await expect(cards).toHaveCount(6);
      await expectNoHorizontalScroll(page);

      await cards.filter({ hasText: "Đà Lạt" }).click();
      await expect(page).toHaveURL(/\/tours\?destination=da-lat$/);
      await expectNotReloaded(page);
      await expect(page.getByRole("heading", { level: 1, name: "Tour du lịch" })).toBeVisible();
    });

    test("/hotels: ô tìm kiếm + 7 khách sạn gợi ý; bấm thẻ mở trang chi tiết", async ({ page }) => {
      await gotoPage(page, "/hotels", 'main a[href="/hotels/khach-san-doi-may-da-lat"]');
      await markPage(page);

      await expect(page.getByRole("heading", { level: 1, name: "Khách sạn", exact: true })).toBeVisible();
      await expect(page.getByRole("note")).toHaveCount(0);
      const form = page.getByRole("form", { name: "Tìm khách sạn" });
      await expect(form.getByRole("combobox", { name: "Điểm đến" })).toContainText("Bạn muốn ở đâu?");

      const list = page.getByRole("region", { name: "Khách sạn gợi ý" });
      await expect(list.getByRole("article")).toHaveCount(7);
      await expect(list).not.toContainText("Resort Biển Xanh");
      await expectNoHorizontalScroll(page);

      const card = list.getByRole("link", { name: "Xem phòng Khách sạn Đồi Mây" });
      await card.scrollIntoViewIfNeeded();
      await card.click();
      await expect(page).toHaveURL(/\/hotels\/khach-san-doi-may-da-lat$/);
      await expectNotReloaded(page);
      await expect(page.getByRole("heading", { level: 1, name: "Khách sạn Đồi Mây" })).toBeVisible();
    });

    test("/hotels: tham số tìm kiếm sai (ngày đã qua) → báo và hiện gợi ý thay vì kết quả", async ({ page }) => {
      await page.goto("/hotels?destination=da-lat&checkIn=2020-01-01&checkOut=2020-01-03&guests=2&rooms=1");
      await expect(page.getByText("Thông tin tìm kiếm chưa đầy đủ hoặc ngày nhận phòng đã qua")).toBeVisible();
      await expect(page.getByRole("region", { name: "Khách sạn gợi ý" }).getByRole("article")).toHaveCount(7);
    });

    test("/flights: ô tìm vé + 6 chặng bay phổ biến; bấm thẻ điền sẵn điểm đi/đến ngay trên trang", async ({
      page,
    }) => {
      await gotoPage(page, "/flights", 'main a[href="/flights#o-tim-ve-may-bay"]');
      await markPage(page);

      await expect(page.getByRole("heading", { level: 1, name: "Vé máy bay", exact: true })).toBeVisible();
      await expect(page.getByRole("note")).toHaveCount(0);
      const form = page.getByRole("form", { name: "Tìm vé máy bay" });

      const list = page.getByRole("region", { name: "Chặng bay phổ biến" });
      await expect(list.getByRole("article")).toHaveCount(6);
      await expectNoHorizontalScroll(page);

      const card = list.getByRole("link", { name: /Tìm chuyến bay SGN\s+đến\s+HAN/ });
      await card.scrollIntoViewIfNeeded();
      await card.click();

      await expect(page).toHaveURL(/\/flights#o-tim-ve-may-bay$/);
      await expectNotReloaded(page);
      await expect(form.getByRole("combobox", { name: "Điểm đi" })).toContainText("TP. Hồ Chí Minh (SGN)");
      await expect(form.getByRole("combobox", { name: "Điểm đến" })).toContainText("Hà Nội (HAN)");
      await expect(form.getByRole("combobox", { name: "Điểm đi" })).toBeInViewport();
      // Chỉ điền sẵn, không tự tìm.
      await expect(page).toHaveURL(/\/flights#o-tim-ve-may-bay$/);
    });
  });
}

test("bấm thẻ ở /flights không đổi tab tìm kiếm của Trang chủ", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('form[aria-label="Tìm tour"] input[name="guests"]')).toHaveValue("2");
  await markPage(page);

  const nav = page.getByRole("navigation", { name: "Điều hướng chính" });
  await nav.getByRole("link", { name: "Vé máy bay", exact: true }).click();
  await expect(page).toHaveURL(/\/flights$/);
  await page
    .getByRole("region", { name: "Chặng bay phổ biến" })
    .getByRole("link", { name: /Tìm chuyến bay SGN\s+đến\s+HAN/ })
    .click();
  await expect(page).toHaveURL(/\/flights#o-tim-ve-may-bay$/);

  await nav.getByRole("link", { name: "Trang chủ", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expectNotReloaded(page);
  await expect(page.getByRole("tab", { name: /^Tour/ })).toHaveAttribute("aria-selected", "true");
  // Ô điểm đi của tab Vé máy bay ở Trang chủ không bị điền theo thẻ ở /flights.
  await page.getByRole("tab", { name: /Vé máy bay/ }).click();
  await expect(
    page.getByRole("tabpanel", { name: /Vé máy bay/ }).getByRole("combobox", { name: "Điểm đi" }),
  ).toContainText("Chọn sân bay đi");
});
