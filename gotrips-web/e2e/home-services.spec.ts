import { expect, test, type Page } from "@playwright/test";
import {
  expectNotReloaded,
  expectTabSelectedAndVisible,
  gotoHome,
  markPage,
  waitForLinkHydrated,
} from "./search-tab-helpers";

/**
 * Hai section thử nghiệm ở thân Trang chủ ("Khách sạn nổi bật", "Chặng bay phổ biến") và các liên kết Footer tới ô tìm
 * kiếm. Bấm một thẻ → trang cuộn lên ô tìm kiếm, mở đúng tab và điền sẵn vài ô (xem lib/hash-navigation.ts và
 * components/home/use-search-prefill.ts). Chạy ở desktop và điện thoại.
 *
 * Dữ liệu mock (lib/mock/*): 4 khách sạn đầu theo điểm đánh giá là Resort Bãi Sao (Phú Quốc), Khách sạn Phố Hoa Đăng
 * (Hội An), Khách sạn Đồi Mây (Đà Lạt), Khách sạn Hoàng Hôn (Phú Quốc); "Resort Biển Xanh" (Nha Trang) là HIDDEN.
 */

const VIEWPORTS = [
  { name: "desktop", viewport: { width: 1280, height: 720 } },
  { name: "điện thoại", viewport: { width: 390, height: 844 } },
] as const;

const NOTICE = "Bản thử nghiệm: bạn có thể thử tìm kiếm, nhưng chưa xem được kết quả và chưa đặt được.";

const hotelsRegion = (page: Page) => page.getByRole("region", { name: "Khách sạn nổi bật" });
const flightsRegion = (page: Page) => page.getByRole("region", { name: "Chặng bay phổ biến" });

/** Đợi popover vừa chọn đóng hẳn (có animation thoát) để thao tác kế tiếp không gặp hai popover cùng lúc. */
async function expectNoPopover(page: Page) {
  await expect(page.locator('[data-slot="popover-content"]')).toHaveCount(0);
}

for (const { name, viewport } of VIEWPORTS) {
  test.describe(`Trang chủ: khách sạn, chặng bay và Footer (${name})`, () => {
    test.use({ viewport });

    test("hai section mới hiển thị, ghi rõ là bản thử nghiệm và không trông như dịch vụ đã chạy", async ({ page }) => {
      await gotoHome(page);
      const hotels = hotelsRegion(page);
      const flights = flightsRegion(page);

      await expect(hotels.getByRole("heading", { level: 2, name: "Khách sạn nổi bật" })).toBeVisible();
      await expect(flights.getByRole("heading", { level: 2, name: "Chặng bay phổ biến" })).toBeVisible();
      await expect(hotels).toContainText("Bản thử nghiệm");
      await expect(flights).toContainText("Bản thử nghiệm");

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

      // Nút ghi "Tìm …", không ghi "Đặt …"; không có "Xem tất cả" dẫn tới trang chưa có.
      await expect(hotels.getByRole("link", { name: /^Tìm khách sạn ở / })).toHaveCount(4);
      await expect(flights.getByRole("link", { name: /^Tìm chuyến bay / })).toHaveCount(6);
      for (const region of [hotels, flights]) {
        await expect(region).not.toContainText(/Đặt phòng|Đặt vé/);
        await expect(region.getByRole("link", { name: /Xem tất cả/ })).toHaveCount(0);
      }
      await expect(page.locator('a[href^="/hotels"], a[href^="/flights"]')).toHaveCount(0);
    });

    test("Trang chủ không có thanh cuộn ngang", async ({ page }) => {
      await gotoHome(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, "nội dung rộng hơn khung nhìn").toBeLessThanOrEqual(0);
    });

    test("bấm thẻ khách sạn → tab Khách sạn, ô điểm đến đã điền, số khách đã chỉnh được giữ, ngày để trống", async ({
      page,
    }) => {
      await gotoHome(page);
      await markPage(page);

      const hotelTab = page.getByRole("tab", { name: /Khách sạn/ });
      await hotelTab.click();
      const panel = page.getByRole("tabpanel", { name: /Khách sạn/ });
      // Khách tự chỉnh trước: 3 khách. Gói điền sẵn chỉ có điểm đến nên phải còn nguyên.
      await panel.getByRole("button", { name: /Khách và phòng/ }).click();
      await page.getByRole("button", { name: "Tăng khách" }).click();
      await page.getByRole("button", { name: "Xong" }).click();
      await expectNoPopover(page);
      await expect(panel.getByRole("button", { name: /Khách và phòng/ })).toContainText("3 khách · 1 phòng");
      await expect(panel.getByRole("combobox", { name: "Điểm đến" })).toContainText("Bạn muốn ở đâu?");

      const card = hotelsRegion(page).getByRole("link", {
        name: "Tìm khách sạn ở Đà Lạt (gợi ý từ Khách sạn Đồi Mây)",
      });
      await card.scrollIntoViewIfNeeded();
      await expect(hotelTab).not.toBeInViewport();
      await card.click();

      await expect(page).toHaveURL(/\/#tim-khach-san$/);
      await expectNotReloaded(page);
      await expectTabSelectedAndVisible(page, hotelTab);
      await expect(panel.getByRole("combobox", { name: "Điểm đến" })).toContainText("Đà Lạt");
      await expect(panel.getByRole("button", { name: /Khách và phòng/ })).toContainText("3 khách · 1 phòng");
      await expect(panel.getByRole("button", { name: /Ngày nhận – trả phòng/ })).toContainText(
        "Chọn ngày nhận và trả phòng",
      );
      // Chỉ điền sẵn, không tự tìm: không có toast "Tính năng đang phát triển".
      await expect(page.getByText("Tính năng đang phát triển")).toBeHidden();
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
      await expect(page.getByText("Tính năng đang phát triển")).toBeHidden();
    });

    test("bấm thẻ thứ hai khi URL đã có đúng hash → vẫn cuộn lên ô tìm kiếm và điền theo thẻ mới", async ({ page }) => {
      await gotoHome(page);
      const hotelTab = page.getByRole("tab", { name: /Khách sạn/ });
      const panel = page.getByRole("tabpanel", { name: /Khách sạn/ });
      const hotels = hotelsRegion(page);

      await hotels.getByRole("link", { name: /Khách sạn Đồi Mây/ }).click();
      await expect(page).toHaveURL(/\/#tim-khach-san$/);
      await expectTabSelectedAndVisible(page, hotelTab);
      await expect(panel.getByRole("combobox", { name: "Điểm đến" })).toContainText("Đà Lạt");

      // URL đang là /#tim-khach-san: Next coi bấm tiếp cùng hash là "không đổi hash" và tự nó không cuộn.
      const second = hotels.getByRole("link", { name: /Khách sạn Phố Hoa Đăng/ });
      await second.scrollIntoViewIfNeeded();
      await expect(hotelTab).not.toBeInViewport();
      await second.click();

      await expect(page).toHaveURL(/\/#tim-khach-san$/);
      await expectTabSelectedAndVisible(page, hotelTab);
      await expect(panel.getByRole("combobox", { name: "Điểm đến" })).toContainText("Hội An");
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

    test("dòng báo 'Bản thử nghiệm' có ở tab Khách sạn và Vé máy bay, không có ở tab Tour", async ({ page }) => {
      await gotoHome(page);

      // Tab Tour (mặc định): không có ghi chú.
      await expect(page.getByRole("tabpanel", { name: /^Tour/ }).getByRole("note")).toHaveCount(0);

      for (const label of [/Khách sạn/, /Vé máy bay/]) {
        await page.getByRole("tab", { name: label }).click();
        const panel = page.getByRole("tabpanel", { name: label });
        const notice = panel.getByRole("note");
        await expect(notice).toBeVisible();
        await expect(notice).toContainText(NOTICE);
        // Là ghi chú tĩnh, không phải thông báo lỗi: không có role="alert" trong panel khi chưa submit.
        await expect(panel.getByRole("alert")).toHaveCount(0);
      }
    });

    for (const { label, hash, submit } of [
      { label: "Khách sạn", hash: "#tim-khach-san", submit: "Tìm khách sạn" },
      { label: "Vé máy bay", hash: "#tim-ve-may-bay", submit: "Tìm chuyến bay" },
    ] as const) {
      const footerLink = (page: Page) =>
        page.getByRole("navigation", { name: "Dịch vụ" }).getByRole("link", { name: label, exact: true });

      test(`Footer "${label}": là liên kết thật tới ô tìm kiếm, không còn nhãn 'Sắp ra mắt'`, async ({ page }) => {
        await gotoHome(page);
        await expect(footerLink(page)).toHaveAttribute("href", `/${hash}`);
        await expect(page.getByRole("navigation", { name: "Dịch vụ" }).getByText("Sắp ra mắt")).toHaveCount(0);
      });

      test(`từ /tours bấm Footer "${label}" → về Trang chủ, tab ${label} được chọn, ô tìm kiếm hiện trong màn hình`, async ({
        page,
      }) => {
        await page.goto("/tours");
        await waitForLinkHydrated(page, `footer a[href="/${hash}"]`);
        await markPage(page);

        await footerLink(page).click();

        await expect(page).toHaveURL(new RegExp(`/${hash}$`));
        await expectNotReloaded(page);
        await expectTabSelectedAndVisible(page, page.getByRole("tab", { name: new RegExp(label) }));
        await expect(page.getByRole("button", { name: submit })).toBeVisible();
        await expect(page.getByRole("button", { name: "Tìm tour" })).toBeHidden();
      });

      test(`đang ở Trang chủ (cuộn xuống cuối) bấm Footer "${label}" → chọn tab ${label} và cuộn lên ô tìm kiếm`, async ({
        page,
      }) => {
        await gotoHome(page);
        await markPage(page);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await expect(page.getByRole("tab", { name: /^Tour/ })).not.toBeInViewport();

        await footerLink(page).click();

        await expect(page).toHaveURL(new RegExp(`/${hash}$`));
        await expectNotReloaded(page);
        await expectTabSelectedAndVisible(page, page.getByRole("tab", { name: new RegExp(label) }));
        await expect(page.getByRole("button", { name: submit })).toBeVisible();
      });

      test(`mở thẳng /${hash} rồi cuộn xuống cuối, bấm Footer "${label}" (hash không đổi) → vẫn cuộn lên`, async ({
        page,
      }) => {
        await gotoHome(page, `/${hash}`);
        await markPage(page);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await expect(page.getByRole("tab", { name: new RegExp(label) })).not.toBeInViewport();

        await footerLink(page).click();

        await expect(page).toHaveURL(new RegExp(`/${hash}$`));
        await expectNotReloaded(page);
        await expectTabSelectedAndVisible(page, page.getByRole("tab", { name: new RegExp(label) }));
      });
    }
  });
}
