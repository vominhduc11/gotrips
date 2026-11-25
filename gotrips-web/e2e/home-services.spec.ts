import { expect, test, type Page } from "@playwright/test";
import {
  expectNotReloaded,
  expectTabSelectedAndVisible,
  gotoHome,
  markPage,
  waitForLinkHydrated,
} from "./search-tab-helpers";

/**
 * Hai section ở thân Trang chủ ("Khách sạn nổi bật", "Chặng bay phổ biến") và các liên kết Footer tới trang dịch vụ.
 * Thẻ khách sạn mở trang chi tiết khách sạn; thẻ chặng bay cuộn lên ô tìm kiếm, mở tab Vé máy bay và điền sẵn điểm
 * đi/đến (xem lib/hash-navigation.ts và components/home/use-search-prefill.ts). Chạy ở desktop và điện thoại.
 *
 * Dữ liệu từ gotrips-api (seed chép từ lib/mock/*): 4 khách sạn đầu theo điểm đánh giá là Resort Bãi Sao (Phú Quốc),
 * Khách sạn Phố Hoa Đăng (Hội An), Khách sạn Đồi Mây (Đà Lạt), Khách sạn Hoàng Hôn (Phú Quốc); "Resort Biển Xanh"
 * (Nha Trang) là HIDDEN.
 */

const VIEWPORTS = [
  { name: "desktop", viewport: { width: 1280, height: 720 } },
  { name: "điện thoại", viewport: { width: 390, height: 844 } },
] as const;

const hotelsRegion = (page: Page) => page.getByRole("region", { name: "Khách sạn nổi bật" });
const flightsRegion = (page: Page) => page.getByRole("region", { name: "Chặng bay phổ biến" });

/** Đợi popover vừa chọn đóng hẳn (có animation thoát) để thao tác kế tiếp không gặp hai popover cùng lúc. */
async function expectNoPopover(page: Page) {
  await expect(page.locator('[data-slot="popover-content"]')).toHaveCount(0);
}

for (const { name, viewport } of VIEWPORTS) {
  test.describe(`Trang chủ: khách sạn, chặng bay và Footer (${name})`, () => {
    test.use({ viewport });

    test("hai section hiển thị đúng số thẻ, giá và liên kết", async ({ page }) => {
      await gotoHome(page);
      const hotels = hotelsRegion(page);
      const flights = flightsRegion(page);

      await expect(hotels.getByRole("heading", { level: 2, name: "Khách sạn nổi bật" })).toBeVisible();
      await expect(flights.getByRole("heading", { level: 2, name: "Chặng bay phổ biến" })).toBeVisible();
      await expect(hotels).not.toContainText("Bản thử nghiệm");
      await expect(flights).not.toContainText("Bản thử nghiệm");

      // Khách sạn: 4 thẻ, khách sạn HIDDEN (điểm cao nhất) không xuất hiện; giá ghi "Giá từ … / đêm".
      await expect(hotels.getByRole("article")).toHaveCount(4);
      await expect(hotels).not.toContainText("Resort Biển Xanh");
      await expect(hotels.getByRole("article").first()).toContainText("Giá từ");
      await expect(hotels.getByRole("article").first()).toContainText("/ đêm");
      // Chặng bay: 6 thẻ, giá ghi "Giá tham khảo từ …".
      await expect(flights.getByRole("article")).toHaveCount(6);
      for (const card of await flights.getByRole("article").all()) {
        await expect(card).toContainText("Giá tham khảo từ");
      }

      // Thẻ khách sạn mở trang chi tiết; thẻ chặng bay chỉ "Tìm …" (chặng bay chưa có ngày nên chưa đặt ngay được).
      await expect(hotels.getByRole("link", { name: /^Xem phòng / })).toHaveCount(4);
      await expect(hotels.getByRole("link", { name: "Xem phòng Khách sạn Đồi Mây" })).toHaveAttribute(
        "href",
        "/hotels/khach-san-doi-may-da-lat",
      );
      await expect(flights.getByRole("link", { name: /^Tìm chuyến bay / })).toHaveCount(6);
      await expect(flights).not.toContainText("Đặt vé");
      await expect(hotels.getByRole("link", { name: "Xem tất cả khách sạn" })).toHaveAttribute("href", "/hotels");
      await expect(flights.getByRole("link", { name: "Xem tất cả chặng bay" })).toHaveAttribute("href", "/flights");
    });

    test("Trang chủ không có thanh cuộn ngang", async ({ page }) => {
      await gotoHome(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, "nội dung rộng hơn khung nhìn").toBeLessThanOrEqual(0);
    });

    test("bấm thẻ khách sạn → mở trang chi tiết khách sạn (client-side)", async ({ page }) => {
      await gotoHome(page);
      await waitForLinkHydrated(page, 'main a[href="/hotels/khach-san-doi-may-da-lat"]');
      await markPage(page);

      const card = hotelsRegion(page).getByRole("link", { name: "Xem phòng Khách sạn Đồi Mây" });
      await card.scrollIntoViewIfNeeded();
      await card.click();

      await expect(page).toHaveURL(/\/hotels\/khach-san-doi-may-da-lat$/);
      await expectNotReloaded(page);
      await expect(page.getByRole("heading", { level: 1, name: "Khách sạn Đồi Mây" })).toBeVisible();
    });

    test("bấm thẻ chặng bay → tab Vé máy bay, điểm đi/đến đúng; loại hành trình và hành khách đã chọn được giữ", async ({
      page,
    }) => {
      await gotoHome(page);
      await markPage(page);

      const flightTab = page.getByRole("tab", { name: /Vé máy bay/ });
      await flightTab.click();
      const panel = page.getByRole("tabpanel", { name: /Vé máy bay/ });
      // Khách tự chọn trước: khứ hồi, 2 người lớn, và một điểm đi khác (sẽ bị chặng bay ghi đè).
      await panel.getByRole("radio", { name: "Khứ hồi" }).click();
      await panel.getByRole("button", { name: /Hành khách/ }).click();
      await page.getByRole("button", { name: "Tăng người lớn" }).click();
      await page.getByRole("button", { name: "Xong" }).click();
      await expectNoPopover(page);
      await panel.getByRole("combobox", { name: "Điểm đi" }).click();
      await page.getByRole("option", { name: /Đà Nẵng \(DAD\)/ }).click();
      await expectNoPopover(page);
      await expect(panel.getByRole("combobox", { name: "Điểm đi" })).toContainText("Đà Nẵng (DAD)");

      const card = flightsRegion(page).getByRole("link", { name: /Tìm chuyến bay SGN\s+đến\s+HAN/ });
      await card.scrollIntoViewIfNeeded();
      await expect(flightTab).not.toBeInViewport();
      await card.click();

      await expect(page).toHaveURL(/\/#tim-ve-may-bay$/);
      await expectNotReloaded(page);
      await expectTabSelectedAndVisible(page, flightTab);
      await expect(panel.getByRole("combobox", { name: "Điểm đi" })).toContainText("TP. Hồ Chí Minh (SGN)");
      await expect(panel.getByRole("combobox", { name: "Điểm đến" })).toContainText("Hà Nội (HAN)");
      await expect(panel.getByRole("radio", { name: "Khứ hồi" })).toBeChecked();
      await expect(panel.getByRole("button", { name: /Hành khách/ })).toContainText("2 người lớn");
      // Chỉ điền sẵn, không tự tìm.
      await expect(page).toHaveURL(/\/#tim-ve-may-bay$/);
    });

    test("bấm thẻ thứ hai khi URL đã có đúng hash → vẫn cuộn lên ô tìm kiếm và điền theo thẻ mới", async ({ page }) => {
      await gotoHome(page);
      const flightTab = page.getByRole("tab", { name: /Vé máy bay/ });
      const panel = page.getByRole("tabpanel", { name: /Vé máy bay/ });
      const flights = flightsRegion(page);

      await flights.getByRole("link", { name: /Tìm chuyến bay SGN\s+đến\s+HAN/ }).click();
      await expect(page).toHaveURL(/\/#tim-ve-may-bay$/);
      await expectTabSelectedAndVisible(page, flightTab);
      await expect(panel.getByRole("combobox", { name: "Điểm đến" })).toContainText("Hà Nội (HAN)");

      // URL đang là /#tim-ve-may-bay: Next coi bấm tiếp cùng hash là "không đổi hash" và tự nó không cuộn.
      const second = flights.getByRole("link", { name: /Tìm chuyến bay SGN\s+đến\s+DAD/ });
      await second.scrollIntoViewIfNeeded();
      await expect(flightTab).not.toBeInViewport();
      await second.click();

      await expect(page).toHaveURL(/\/#tim-ve-may-bay$/);
      await expectTabSelectedAndVisible(page, flightTab);
      await expect(panel.getByRole("combobox", { name: "Điểm đến" })).toContainText("Đà Nẵng (DAD)");
    });

    test("gói điền sẵn không hợp lệ bị bỏ qua (tab vẫn được chọn, ô không bị ghi gì)", async ({ page }) => {
      await gotoHome(page);
      // Tên sự kiện khớp HASH_NAVIGATION_EVENT trong lib/hash-navigation.ts. Giả lập script lạ phát sự kiện.
      const announce = (hash: string, payload: unknown) =>
        page.evaluate(
          ([h, p]) =>
            window.dispatchEvent(new CustomEvent("gotrips:hash-navigation", { detail: { hash: h, payload: p } })),
          [hash, payload] as const,
        );

      await announce("#tim-khach-san", { destination: "khong-co-trong-danh-sach" });
      await expect(page.getByRole("tab", { name: /Khách sạn/ })).toHaveAttribute("aria-selected", "true");
      const hotelPanel = page.getByRole("tabpanel", { name: /Khách sạn/ });
      await expect(hotelPanel.getByRole("combobox", { name: "Điểm đến" })).toContainText("Bạn muốn ở đâu?");

      await announce("#tim-khach-san", "<script>alert(1)</script>");
      await announce("#tim-khach-san", null);
      await expect(hotelPanel.getByRole("combobox", { name: "Điểm đến" })).toContainText("Bạn muốn ở đâu?");

      // Điểm đi trùng điểm đến → bỏ cả gói, không điền nửa chừng.
      await announce("#tim-ve-may-bay", { from: "SGN", to: "SGN" });
      await expect(page.getByRole("tab", { name: /Vé máy bay/ })).toHaveAttribute("aria-selected", "true");
      const flightPanel = page.getByRole("tabpanel", { name: /Vé máy bay/ });
      await expect(flightPanel.getByRole("combobox", { name: "Điểm đi" })).toContainText("Chọn sân bay đi");
      await expect(flightPanel.getByRole("combobox", { name: "Điểm đến" })).toContainText("Chọn sân bay đến");
    });

    test("tab Khách sạn và Vé máy bay không còn nhãn 'Sắp ra mắt' hay dòng báo thử nghiệm", async ({ page }) => {
      await gotoHome(page);
      for (const label of [/^Tour/, /Khách sạn/, /Vé máy bay/]) {
        await page.getByRole("tab", { name: label }).click();
        const panel = page.getByRole("tabpanel", { name: label });
        await expect(panel.getByRole("note")).toHaveCount(0);
        await expect(panel.getByRole("alert")).toHaveCount(0);
      }
      await expect(page.getByRole("tablist", { name: "Loại dịch vụ" })).not.toContainText("Sắp ra mắt");
    });

    for (const { label, path, heading } of [
      { label: "Tour du lịch", path: "/tours", heading: "Tour du lịch" },
      { label: "Khách sạn", path: "/hotels", heading: "Khách sạn" },
      { label: "Vé máy bay", path: "/flights", heading: "Vé máy bay" },
    ] as const) {
      const footerLink = (page: Page) =>
        page.getByRole("navigation", { name: "Dịch vụ" }).getByRole("link", { name: label, exact: true });

      test(`Footer "${label}" → mở trang ${path} (client-side), không đụng tới tab tìm kiếm`, async ({ page }) => {
        await gotoHome(page);
        await expect(footerLink(page)).toHaveAttribute("href", path);
        await expect(page.getByRole("navigation", { name: "Dịch vụ" }).getByText("Sắp ra mắt")).toHaveCount(0);
        await waitForLinkHydrated(page, `footer a[href="${path}"]`);
        await markPage(page);

        await footerLink(page).click();

        await expect(page).toHaveURL(new RegExp(`${path}$`));
        await expectNotReloaded(page);
        await expect(page.getByRole("heading", { level: 1, name: heading, exact: true })).toBeVisible();
      });
    }
  });
}
