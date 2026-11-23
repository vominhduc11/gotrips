import { expect, test } from "@playwright/test";

test("bấm thẻ điểm đến ở Trang chủ mở /tours đã lọc theo điểm đến đó", async ({ page }) => {
  await page.goto("/");
  await page.locator("#diem-den").getByRole("link", { name: /Đà Lạt/ }).click();

  await expect(page).toHaveURL(/\/tours\?destination=da-lat$/);
  await expect(page.getByRole("heading", { level: 1, name: "Tour du lịch" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Tour Đà Lạt" })).toBeVisible();

  const cards = page.getByRole("article");
  await expect(cards.first()).toBeVisible();
  for (const card of await cards.all()) {
    await expect(card).toContainText("Đà Lạt");
  }
  await expect(page.getByRole("link", { name: "Đà Lạt", exact: true })).toHaveAttribute("aria-current", "true");
});

test("/tours không lọc hiện tất cả tour và bỏ lọc bằng chip điểm đến", async ({ page }) => {
  await page.goto("/tours");
  // Danh sách được stream sau static shell → chờ thẻ đầu xuất hiện rồi mới đếm.
  await expect(page.getByRole("article").first()).toBeVisible();
  const all = await page.getByRole("article").count();
  expect(all).toBeGreaterThan(2);

  await page.getByRole("navigation", { name: "Lọc theo điểm đến" }).getByRole("link", { name: "Sapa" }).click();
  await expect(page).toHaveURL(/destination=sapa/);
  expect(await page.getByRole("article").count()).toBeLessThan(all);

  await page.getByRole("navigation", { name: "Lọc theo điểm đến" }).getByRole("link", { name: "Tất cả" }).click();
  await expect(page).toHaveURL(/\/tours$/);
  await expect(page.getByRole("article")).toHaveCount(all);
});

test("đổi sắp xếp cập nhật URL và thứ tự giá", async ({ page }) => {
  await page.goto("/tours");

  await page.getByRole("combobox", { name: "Sắp xếp tour" }).click();
  await page.getByRole("option", { name: "Giá thấp đến cao" }).click();
  await expect(page).toHaveURL(/sort=gia-tang/);

  // Giá "từ" của các thẻ còn đặt được phải tăng dần (thẻ hết chỗ không có giá, nằm cuối).
  const prices = await page.locator("article p.text-accent-700").allTextContents();
  const numbers = prices.map((text) => Number(text.replace(/\D/g, "")));
  expect(numbers.length).toBeGreaterThan(1);
  expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
});

test("bộ lọc từ form tìm kiếm hiện thành chip và gỡ được", async ({ page }) => {
  await page.goto("/tours?destination=da-lat&guests=2");

  const chips = page.getByRole("list", { name: "Bộ lọc đang áp dụng" });
  await expect(chips.getByRole("link", { name: /2 khách/ })).toBeVisible();

  await chips.getByRole("link", { name: /2 khách/ }).click();
  await expect(page).toHaveURL(/\/tours\?destination=da-lat$/);
  await expect(chips).toHaveCount(0);
});

test("không có kết quả thì hiện trạng thái rỗng kèm đường về tất cả tour", async ({ page }) => {
  await page.goto("/tours?q=khong-ton-tai-xyz");

  await expect(page.getByText("Chưa tìm thấy tour phù hợp")).toBeVisible();
  await page.getByRole("link", { name: "Xem tất cả tour" }).click();
  await expect(page).toHaveURL(/\/tours$/);
  await expect(page.getByRole("article").first()).toBeVisible();
});

test("tham số URL rác không làm trang lỗi", async ({ page }) => {
  const response = await page.goto("/tours?guests=abc&date=mai&sort=xyz&page=-3");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: "Tour du lịch" })).toBeVisible();
  await expect(page.getByRole("article").first()).toBeVisible();
});
