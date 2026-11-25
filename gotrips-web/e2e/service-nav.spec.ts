import { expect, test, type Page } from "@playwright/test";
import { expectNotReloaded, gotoHome, markPage, waitForHeaderHydrated } from "./search-tab-helpers";

/**
 * Menu chính (Header): mỗi mục là một TRANG RIÊNG và không đụng tới tab của ô tìm kiếm ở Trang chủ.
 * Chạy ở desktop (menu ngang) và điện thoại (menu hamburger `MobileNav`). Danh sách mục: components/layout/nav-items.ts.
 *
 * Phần cuối: hash `/#tim-…` vẫn chọn được tab khi mở thẳng đường dẫn (thẻ ở thân Trang chủ dùng cơ chế này, xem
 * home-services.spec.ts), nhưng menu không còn trỏ tới các hash đó.
 */

const VIEWPORTS = [
  { name: "desktop", viewport: { width: 1280, height: 720 }, mobile: false },
  { name: "điện thoại", viewport: { width: 390, height: 844 }, mobile: true },
] as const;

/** Mục menu → trang đích và `h1` của trang đó. */
const PAGES = [
  { label: "Tour du lịch", path: "/tours", heading: "Tour du lịch" },
  { label: "Điểm đến", path: "/destinations", heading: "Điểm đến" },
  { label: "Khách sạn", path: "/hotels", heading: "Khách sạn" },
  { label: "Vé máy bay", path: "/flights", heading: "Vé máy bay" },
] as const;

/**
 * Mở menu hamburger ở điện thoại và đợi menu hiện. `MobileNav` nằm trong <Suspense> (đọc cookie phiên) nên hydrate
 * muộn hơn phần còn lại của Header; bấm sớm thì click bị mất và menu không mở. Thử lại cho tới khi menu thật sự mở
 * (chỉ bấm khi nó đang đóng, vì bấm lần nữa lúc đang mở sẽ đóng nó).
 */
async function openMobileMenu(page: Page) {
  const menu = page.getByRole("navigation", { name: "Menu di động" });
  const toggle = page.getByRole("button", { name: /^(Mở|Đóng) menu$/ });
  await expect(async () => {
    if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click({ timeout: 2_000 });
    await expect(menu).toBeVisible({ timeout: 1_000 });
  }).toPass();
  return menu;
}

for (const { name, viewport, mobile } of VIEWPORTS) {
  test.describe(`menu Header → trang riêng (${name})`, () => {
    test.use({ viewport });

    /** Bấm mục menu theo tên; ở điện thoại thì mở hamburger trước và kiểm tra menu tự đóng sau khi chọn. */
    async function clickNav(page: Page, label: string) {
      if (mobile) {
        const menu = await openMobileMenu(page);
        await menu.getByRole("link", { name: label, exact: true }).click();
        await expect(menu).toBeHidden();
      } else {
        const nav = page.getByRole("navigation", { name: "Điều hướng chính" });
        await nav.getByRole("link", { name: label, exact: true }).click();
      }
    }

    test("mọi mục menu là liên kết tới trang riêng, không có hash và không có nhãn 'Sắp ra mắt'", async ({ page }) => {
      await gotoHome(page);
      const nav = mobile ? await openMobileMenu(page) : page.getByRole("navigation", { name: "Điều hướng chính" });

      await expect(nav.getByRole("link", { name: "Trang chủ", exact: true })).toHaveAttribute("href", "/");
      for (const { label, path } of PAGES) {
        await expect(nav.getByRole("link", { name: label, exact: true })).toHaveAttribute("href", path);
      }
      await expect(nav.locator('a[href*="#"]')).toHaveCount(0);
      await expect(nav.getByText("Sắp ra mắt")).toHaveCount(0);
    });

    for (const { label, path, heading } of PAGES) {
      test(`từ Trang chủ bấm "${label}" → mở ${path} (client-side), có h1 "${heading}"`, async ({ page }) => {
        await gotoHome(page);
        await markPage(page);

        await clickNav(page, label);

        await expect(page).toHaveURL(new RegExp(`${path}$`));
        await expectNotReloaded(page);
        await expect(page.getByRole("heading", { level: 1, name: heading, exact: true })).toBeVisible();
        // Không còn ở Trang chủ: ô tìm kiếm 3 tab không hiện.
        await expect(page.getByRole("tablist", { name: "Loại dịch vụ" })).toBeHidden();
      });
    }

    test("đi qua lại giữa các trang bằng menu, rồi về Trang chủ bằng mục 'Trang chủ'", async ({ page }) => {
      await page.goto("/tours");
      await waitForHeaderHydrated(page);
      await markPage(page);

      for (const { label, path, heading } of [...PAGES].reverse()) {
        await clickNav(page, label);
        await expect(page).toHaveURL(new RegExp(`${path}$`));
        await expect(page.getByRole("heading", { level: 1, name: heading, exact: true })).toBeVisible();
      }

      await clickNav(page, "Trang chủ");
      await expect(page).toHaveURL(/\/$/);
      await expectNotReloaded(page);
      await expect(page.getByRole("tab", { name: /^Tour/ })).toBeVisible();
    });

    test("menu không điều khiển tab tìm kiếm: tab khách tự chọn ở Trang chủ giữ nguyên, URL không có hash", async ({
      page,
    }) => {
      await gotoHome(page);
      await markPage(page);

      // Khách tự chọn tab Vé máy bay ở Trang chủ.
      await page.getByRole("tab", { name: /Vé máy bay/ }).click();
      await expect(page.getByRole("tab", { name: /Vé máy bay/ })).toHaveAttribute("aria-selected", "true");

      // Bấm "Khách sạn" trên menu: sang trang /hotels, KHÔNG chuyển tab Khách sạn ở Trang chủ.
      await clickNav(page, "Khách sạn");
      await expect(page).toHaveURL(/\/hotels$/);
      await expect(page.getByRole("heading", { level: 1, name: "Khách sạn", exact: true })).toBeVisible();

      await clickNav(page, "Trang chủ");
      await expect(page).toHaveURL(/\/$/);
      await expectNotReloaded(page);
      await expect(page.getByRole("tab", { name: /Vé máy bay/ })).toHaveAttribute("aria-selected", "true");
      await expect(page.getByRole("tab", { name: /Khách sạn/ })).toHaveAttribute("aria-selected", "false");
    });
  });
}

test.describe("Trang chủ: hash trên URL chọn tab tìm kiếm", () => {
  for (const { label, hash, submit } of [
    { label: "Khách sạn", hash: "#tim-khach-san", submit: "Tìm khách sạn" },
    { label: "Vé máy bay", hash: "#tim-ve-may-bay", submit: "Tìm chuyến bay" },
  ] as const) {
    test(`mở thẳng /${hash} → tab ${label} được chọn`, async ({ page }) => {
      await gotoHome(page, `/${hash}`);

      await expect(page.getByRole("tab", { name: new RegExp(label) })).toHaveAttribute("aria-selected", "true");
      await expect(page.getByRole("button", { name: submit })).toBeVisible();
    });
  }

  test("hash không khớp tab nào (/#abc) → giữ tab Tour", async ({ page }) => {
    await gotoHome(page, "/#abc");

    await expect(page.getByRole("tab", { name: /^Tour/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("button", { name: "Tìm tour" })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Khách sạn/ })).toHaveAttribute("aria-selected", "false");
    await expect(page.getByRole("tab", { name: /Vé máy bay/ })).toHaveAttribute("aria-selected", "false");
  });

  test("mở thẳng /#tim-tour → tab Tour", async ({ page }) => {
    await gotoHome(page, "/#tim-tour");
    await expect(page.getByRole("tab", { name: /^Tour/ })).toHaveAttribute("aria-selected", "true");
  });
});
