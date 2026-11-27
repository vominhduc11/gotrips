import type { Page } from "@playwright/test";
import type {
  DestinationResponse,
  FlightRouteCardResponse,
  HotelCardResponse,
} from "../lib/api/generated/model";
import { apiGet, expect, test } from "./fixtures";
import { expectNotReloaded, markPage, waitForHeaderHydrated } from "./search-tab-helpers";

/**
 * Trang riêng của các mục menu: /destinations, /hotels, /flights. Khi chưa tìm: /hotels có ô tìm kiếm + khách sạn gợi ý
 * (bấm thẻ mở trang chi tiết); /flights có ô tìm vé + chặng bay phổ biến (bấm thẻ điền sẵn ô tìm kiếm NGAY TRÊN TRANG
 * đó). Kết quả tìm kiếm và luồng đặt nằm ở hotel-booking.spec.ts / flight-booking.spec.ts.
 *
 * Số thẻ, tên và chặng bay kỳ vọng đọc từ gotrips-api (cần API + DB có dữ liệu seed). "Resort Biển Xanh" là khách sạn
 * đang ẩn trong dữ liệu seed.
 */

const VIEWPORTS = [
  { name: "desktop", viewport: { width: 1280, height: 720 } },
  { name: "điện thoại", viewport: { width: 390, height: 844 } },
] as const;

/** Tên liên kết của thẻ chặng bay ("đến" nằm trong sr-only nên khoảng trắng không cố định). */
const routeLinkName = (route: FlightRouteCardResponse) =>
  new RegExp(`Tìm chuyến bay ${route.from.code}\\s+đến\\s+${route.to.code}`);

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

    test("/destinations: breadcrumb, h1, đủ điểm đến; bấm thẻ mở /tours đã lọc", async ({ page, request }) => {
      const destinations = await apiGet<DestinationResponse[]>(request, "/destinations");
      const target = destinations.find((d) => d.tourCount > 0)!;
      const targetCard = `main a[href="/tours?destination=${target.slug}"]`;
      await gotoPage(page, "/destinations", targetCard);
      await markPage(page);

      await expect(page.getByRole("heading", { level: 1, name: "Điểm đến", exact: true })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "breadcrumb" })).toContainText("Trang chủ");
      await expect(page.locator('main a[href^="/tours?destination="]')).toHaveCount(destinations.length);
      await expectNoHorizontalScroll(page);

      await page.locator(targetCard).click();
      await expect(page).toHaveURL(new RegExp(`/tours\\?destination=${target.slug}$`));
      await expectNotReloaded(page);
      await expect(page.getByRole("heading", { level: 1, name: "Tour du lịch" })).toBeVisible();
    });

    test("/hotels: ô tìm kiếm + khách sạn gợi ý; bấm thẻ mở trang chi tiết", async ({ page, request }) => {
      const suggestions = await apiGet<HotelCardResponse[]>(request, "/hotels/featured", { limit: 50 });
      const first = suggestions[0]!;
      await gotoPage(page, "/hotels", `main a[href="/hotels/${first.slug}"]`);
      await markPage(page);

      await expect(page.getByRole("heading", { level: 1, name: "Khách sạn", exact: true })).toBeVisible();
      await expect(page.getByRole("note")).toHaveCount(0);
      const form = page.getByRole("form", { name: "Tìm khách sạn" });
      await expect(form.getByRole("combobox", { name: "Điểm đến" })).toContainText("Bạn muốn ở đâu?");

      const list = page.getByRole("region", { name: "Khách sạn gợi ý" });
      await expect(list.getByRole("article")).toHaveCount(suggestions.length);
      await expect(list).not.toContainText("Resort Biển Xanh");
      await expectNoHorizontalScroll(page);

      const card = list.getByRole("link", { name: `Xem phòng ${first.name}` });
      await card.scrollIntoViewIfNeeded();
      await card.click();
      await expect(page).toHaveURL(new RegExp(`/hotels/${first.slug}$`));
      await expectNotReloaded(page);
      await expect(page.getByRole("heading", { level: 1, name: first.name })).toBeVisible();
    });

    test("/hotels: tham số tìm kiếm sai (ngày đã qua) → báo và hiện gợi ý thay vì kết quả", async ({
      page,
      request,
    }) => {
      const suggestions = await apiGet<HotelCardResponse[]>(request, "/hotels/featured", { limit: 50 });
      await page.goto("/hotels?destination=da-lat&checkIn=2020-01-01&checkOut=2020-01-03&guests=2&rooms=1");
      await expect(page.getByText("Thông tin tìm kiếm chưa đầy đủ hoặc ngày nhận phòng đã qua")).toBeVisible();
      await expect(page.getByRole("region", { name: "Khách sạn gợi ý" }).getByRole("article")).toHaveCount(
        suggestions.length,
      );
    });

    test("/flights: ô tìm vé + chặng bay phổ biến; bấm thẻ điền sẵn điểm đi/đến ngay trên trang", async ({
      page,
      request,
    }) => {
      const routes = await apiGet<FlightRouteCardResponse[]>(request, "/flight-routes/popular", { limit: 50 });
      const route = routes[0]!;
      await gotoPage(page, "/flights", 'main a[href="/flights#o-tim-ve-may-bay"]');
      await markPage(page);

      await expect(page.getByRole("heading", { level: 1, name: "Vé máy bay", exact: true })).toBeVisible();
      await expect(page.getByRole("note")).toHaveCount(0);
      const form = page.getByRole("form", { name: "Tìm vé máy bay" });

      const list = page.getByRole("region", { name: "Chặng bay phổ biến" });
      await expect(list.getByRole("article")).toHaveCount(routes.length);
      await expectNoHorizontalScroll(page);

      const card = list.getByRole("link", { name: routeLinkName(route) });
      await card.scrollIntoViewIfNeeded();
      await card.click();

      await expect(page).toHaveURL(/\/flights#o-tim-ve-may-bay$/);
      await expectNotReloaded(page);
      await expect(form.getByRole("combobox", { name: "Điểm đi" })).toContainText(
        `${route.from.city} (${route.from.code})`,
      );
      await expect(form.getByRole("combobox", { name: "Điểm đến" })).toContainText(
        `${route.to.city} (${route.to.code})`,
      );
      await expect(form.getByRole("combobox", { name: "Điểm đi" })).toBeInViewport();
      // Chỉ điền sẵn, không tự tìm.
      await expect(page).toHaveURL(/\/flights#o-tim-ve-may-bay$/);
    });
  });
}

test("bấm thẻ ở /flights không đổi tab tìm kiếm của Trang chủ", async ({ page, request }) => {
  const [route] = await apiGet<FlightRouteCardResponse[]>(request, "/flight-routes/popular", { limit: 50 });
  await page.goto("/");
  await expect(page.locator('form[aria-label="Tìm tour"] input[name="guests"]')).toHaveValue("2");
  await markPage(page);

  const nav = page.getByRole("navigation", { name: "Điều hướng chính" });
  await nav.getByRole("link", { name: "Vé máy bay", exact: true }).click();
  await expect(page).toHaveURL(/\/flights$/);
  await page
    .getByRole("region", { name: "Chặng bay phổ biến" })
    .getByRole("link", { name: routeLinkName(route!) })
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
