import { expect, test, type Page } from "@playwright/test";
import {
  expectNotReloaded,
  expectTabSelectedAndVisible,
  gotoHome,
  markPage,
  waitForHeaderHydrated,
} from "./search-tab-helpers";

/**
 * Menu Header "Khách sạn" / "Vé máy bay" → về ô tìm kiếm ở Trang chủ, tab tương ứng được chọn sẵn.
 * Chạy ở desktop (menu ngang) và điện thoại (menu hamburger `MobileNav`). Hash ↔ tab: components/home/service-tab-hash.ts.
 */

const VIEWPORTS = [
  { name: "desktop", viewport: { width: 1280, height: 720 }, mobile: false },
  { name: "điện thoại", viewport: { width: 390, height: 844 }, mobile: true },
] as const;

const TABS = [
  { label: "Khách sạn", hash: "#tim-khach-san", submit: "Tìm khách sạn" },
  { label: "Vé máy bay", hash: "#tim-ve-may-bay", submit: "Tìm chuyến bay" },
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
  test.describe(`menu Header → ô tìm kiếm (${name})`, () => {
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

    test("mục Khách sạn và Vé máy bay là liên kết thật, không còn nhãn 'Sắp ra mắt' trên menu", async ({ page }) => {
      await gotoHome(page);
      const nav = mobile ? await openMobileMenu(page) : page.getByRole("navigation", { name: "Điều hướng chính" });

      for (const { label, hash } of TABS) {
        await expect(nav.getByRole("link", { name: label, exact: true })).toHaveAttribute("href", `/${hash}`);
      }
      await expect(nav.getByText("Sắp ra mắt")).toHaveCount(0);
      // Ô tìm kiếm thì vẫn ghi "Sắp ra mắt" vì submit mới chỉ hiện toast.
      await expect(page.getByRole("tab", { name: /Khách sạn/ })).toContainText("Sắp ra mắt");
      await expect(page.getByRole("tab", { name: /Vé máy bay/ })).toContainText("Sắp ra mắt");
    });

    for (const { label, hash, submit } of TABS) {
      test(`từ /tours bấm "${label}" → về Trang chủ, tab ${label} được chọn và ô tìm kiếm hiện trong màn hình`, async ({
        page,
      }) => {
        await page.goto("/tours");
        await waitForHeaderHydrated(page);
        await markPage(page);

        await clickNav(page, label);

        await expect(page).toHaveURL(new RegExp(`/${hash}$`));
        await expectNotReloaded(page);
        await expectTabSelectedAndVisible(page, page.getByRole("tab", { name: new RegExp(label) }));
        await expect(page.getByRole("button", { name: submit })).toBeVisible();
        await expect(page.getByRole("button", { name: "Tìm tour" })).toBeHidden();
      });

      test(`đang ở Trang chủ (đã cuộn xuống cuối) bấm "${label}" → chọn tab ${label}, cuộn lên ô tìm kiếm, không tải lại trang`, async ({
        page,
      }) => {
        await gotoHome(page);
        await markPage(page);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await expect(page.getByRole("tab", { name: /^Tour/ })).not.toBeInViewport();

        await clickNav(page, label);

        await expect(page).toHaveURL(new RegExp(`/${hash}$`));
        await expectNotReloaded(page);
        await expectTabSelectedAndVisible(page, page.getByRole("tab", { name: new RegExp(label) }));
        await expect(page.getByRole("button", { name: submit })).toBeVisible();
      });

      test(`mở thẳng /${hash} → tab ${label} được chọn và ô tìm kiếm hiện trong màn hình`, async ({ page }) => {
        await gotoHome(page, `/${hash}`);

        await expectTabSelectedAndVisible(page, page.getByRole("tab", { name: new RegExp(label) }));
        await expect(page.getByRole("button", { name: submit })).toBeVisible();
      });
    }

    test("Trang chủ được giữ nguyên khi rời đi (Activity): quay lại bằng menu vẫn chọn đúng tab", async ({ page }) => {
      await gotoHome(page);
      await markPage(page);
      // Dữ liệu đã nhập là bằng chứng Trang chủ được Next giữ lại (Activity) chứ không dựng lại từ đầu.
      await page.locator("#tim-so-khach").fill("5");

      // Trang chủ → /tours (client-side, Trang chủ bị Next ẩn chứ không gỡ) → bấm Vé máy bay.
      await clickNav(page, "Tour du lịch");
      await expect(page).toHaveURL(/\/tours$/);
      await clickNav(page, "Vé máy bay");
      await expect(page.locator("#tim-so-khach")).toHaveValue("5");

      await expect(page).toHaveURL(/\/#tim-ve-may-bay$/);
      await expectNotReloaded(page);
      await expectTabSelectedAndVisible(page, page.getByRole("tab", { name: /Vé máy bay/ }));

      // Lại rời đi rồi bấm tab khác: phải đổi sang tab mới, không kẹt ở tab trước.
      await clickNav(page, "Tour du lịch");
      await clickNav(page, "Khách sạn");
      await expect(page).toHaveURL(/\/#tim-khach-san$/);
      await expectTabSelectedAndVisible(page, page.getByRole("tab", { name: /Khách sạn/ }));
    });

    test("bấm lại mục menu sau khi tự đổi tab → tab theo menu được chọn lại dù hash không đổi", async ({ page }) => {
      await gotoHome(page);
      await clickNav(page, "Khách sạn");
      await expectTabSelectedAndVisible(page, page.getByRole("tab", { name: /Khách sạn/ }));

      // Tự bấm tab Tour: không ghi hash lên URL, URL vẫn là #tim-khach-san.
      await page.getByRole("tab", { name: /^Tour/ }).click();
      await expect(page.getByRole("tab", { name: /^Tour/ })).toHaveAttribute("aria-selected", "true");
      await expect(page).toHaveURL(/\/#tim-khach-san$/);

      await clickNav(page, "Khách sạn");
      await expectTabSelectedAndVisible(page, page.getByRole("tab", { name: /Khách sạn/ }));
    });

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
}
