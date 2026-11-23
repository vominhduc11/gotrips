import { expect, test } from "@playwright/test";

const SLUG = "phu-quoc-4n3d-dao-ngoc-nghi-duong"; // tour 3: có giảm giá và có đánh giá

test("bấm 'Xem chi tiết' ở thẻ tour mở trang chi tiết đúng tour", async ({ page }) => {
  await page.goto("/tours?destination=phu-quoc");
  await page.getByRole("link", { name: /Xem chi tiết tour Phú Quốc/ }).first().click();

  await expect(page).toHaveURL(new RegExp(`/tours/${SLUG}$`));
  await expect(page.getByRole("heading", { level: 1, name: /Phú Quốc 4N3Đ/ })).toBeVisible();
});

test("trang chi tiết hiện giá từ, lịch khởi hành, đánh giá và breadcrumb", async ({ page }) => {
  await page.goto(`/tours/${SLUG}`);

  await expect(page.getByRole("heading", { level: 2, name: "Lịch khởi hành" })).toBeVisible();
  const departures = page.getByRole("region", { name: "Lịch khởi hành" }).getByRole("listitem");
  expect(await departures.count()).toBeGreaterThanOrEqual(3);

  const priceCard = page.getByRole("complementary", { name: "Giá và đặt tour" });
  await expect(priceCard).toContainText("Giá từ");
  await expect(priceCard.getByRole("button", { name: "Đặt tour" })).toBeDisabled();

  await expect(page.getByRole("heading", { level: 2, name: "Khách hàng nói gì" })).toBeVisible();

  const crumbs = page.getByRole("navigation", { name: "breadcrumb" });
  await crumbs.getByRole("link", { name: "Phú Quốc", exact: true }).click();
  await expect(page).toHaveURL(/\/tours\?destination=phu-quoc$/);
});

test("có JSON-LD TouristTrip hợp lệ", async ({ page }) => {
  await page.goto(`/tours/${SLUG}`);
  const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
  const data = JSON.parse(raw ?? "{}");
  expect(data["@type"]).toBe("TouristTrip");
  expect(data.offers.priceCurrency).toBe("VND");
});

test("slug không tồn tại hoặc tour bị ẩn hiện 404 tiếng Việt và không bị lập chỉ mục", async ({ page }) => {
  for (const slug of ["khong-ton-tai", "sapa-4n3d-chinh-phuc-fansipan"]) {
    // Với Cache Components, slug ngoài generateStaticParams được stream sau shell nên mã HTTP vẫn là 200
    // (xem docs Next: loading.md > Status codes); Next tự chèn meta noindex để công cụ tìm kiếm bỏ qua.
    await page.goto(`/tours/${slug}`);
    await expect(page.getByRole("heading", { level: 1, name: "Không tìm thấy trang bạn cần" })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  }
});
