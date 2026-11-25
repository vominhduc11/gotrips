import { expect, test } from "@playwright/test";

/**
 * Dữ liệu danh mục lấy từ gotrips-api (profile `seed`, chép từ mock cũ): Trang chủ phải hiện đúng số thẻ/thứ tự như
 * trước khi nối API. Cần gotrips-api + DB đang chạy (xem CLAUDE.md). Các section stream sau static shell nên mỗi
 * khẳng định dùng `toHaveCount`/`toBeVisible` (tự chờ) thay vì đếm ngay.
 */

const grid = (section: string) => `${section} > div > ul > li`;

test("Trang chủ hiện đủ dữ liệu từ API: 6 điểm đến, 8 tour, 4 khách sạn, 6 chặng bay, 4 đánh giá", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator(grid("#diem-den"))).toHaveCount(6);
  await expect(page.locator(grid("#tour-noi-bat"))).toHaveCount(8);
  await expect(page.locator(grid('section[aria-labelledby="khach-san-noi-bat-heading"]'))).toHaveCount(4);
  await expect(page.locator(grid('section[aria-labelledby="chang-bay-pho-bien-heading"]'))).toHaveCount(6);
  await expect(page.locator(grid('section[aria-labelledby="khach-hang-heading"]'))).toHaveCount(4);

  // Không có khung chờ nào kẹt lại, không có thông báo lỗi.
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByText(/Chưa tải được/)).toHaveCount(0);
});

test("Trang chủ: tour nổi bật theo id, đúng giá từ, giảm giá và nhãn sắp hết chỗ do API tính", async ({ page }) => {
  await page.goto("/");
  const tours = page.locator(grid("#tour-noi-bat"));
  await expect(tours).toHaveCount(8);

  // Tour 7 (HIDDEN) không có; thứ tự theo id: 1, 2, 3, 4, 5, 6, 8, 9.
  await expect(tours.nth(0)).toContainText("Đà Lạt 3N2Đ – Thành phố ngàn hoa");
  // Tour 1: chuyến 09/01 rẻ nhất đã đầy nên bị bỏ qua → ngày gần nhất 23/01, giá từ 3.290.000 (chuyến 13/03).
  await expect(tours.nth(0)).toContainText("23/01/2027");
  await expect(tours.nth(0)).toContainText("3.290.000");
  // Tour 3: giá từ 8.490.000 (chuyến 08/04) và đang giảm giá.
  await expect(tours.nth(2)).toContainText("Phú Quốc 4N3Đ");
  await expect(tours.nth(2)).toContainText("8.490.000");
  await expect(tours.nth(2)).toContainText("10.490.000");
  // Tour 5: chuyến gần nhất còn 3 chỗ.
  await expect(tours.nth(4)).toContainText("Hạ Long 2N1Đ");
  await expect(tours.nth(4)).toContainText("Sắp hết chỗ");
  await expect(page.getByText("Chinh phục Fansipan")).toHaveCount(0);
});

test("Trang chủ: khách sạn sắp theo điểm đánh giá, không có khách sạn đang ẩn", async ({ page }) => {
  await page.goto("/");
  const hotels = page.locator(grid('section[aria-labelledby="khach-san-noi-bat-heading"]'));
  await expect(hotels).toHaveCount(4);

  await expect(hotels.nth(0)).toContainText("Resort Bãi Sao");
  await expect(hotels.nth(0)).toContainText("3.200.000");
  await expect(hotels.nth(1)).toContainText("Khách sạn Phố Hoa Đăng");
  await expect(hotels.nth(2)).toContainText("Khách sạn Đồi Mây");
  await expect(hotels.nth(3)).toContainText("Khách sạn Hoàng Hôn");
  await expect(page.getByText("Resort Biển Xanh")).toHaveCount(0);
});

test("/destinations hiện đủ 6 điểm đến lấy từ API", async ({ page }) => {
  await page.goto("/destinations");

  await expect(page.getByRole("heading", { level: 1, name: "Điểm đến" })).toBeVisible();
  // Đếm đúng lưới thẻ (không dùng `listitem` chung: `main` còn có danh sách khác, ví dụ đường dẫn phân cấp).
  await expect(page.locator("main ul.grid > li")).toHaveCount(6);
  await expect(page.locator("main").getByRole("link", { name: /Sapa/ })).toBeVisible();
});

test("các trang dùng danh sách điểm đến/sân bay từ API vẫn dùng được: /tours, /hotels, /flights", async ({ page }) => {
  // /tours: chip lọc theo điểm đến.
  await page.goto("/tours");
  const filters = page.getByRole("navigation", { name: "Lọc theo điểm đến" });
  await expect(filters.getByRole("link", { name: "Hạ Long" })).toBeVisible();
  await expect(filters.getByRole("link", { name: "Nha Trang" })).toBeVisible();

  // /hotels: ô chọn điểm đến của form tìm khách sạn.
  await page.goto("/hotels");
  const hotelDestination = page.getByRole("combobox", { name: "Điểm đến" });
  await hotelDestination.click();
  await expect(page.getByRole("option", { name: /Phú Quốc/ })).toBeVisible();
  await page.keyboard.press("Escape");

  // /flights: ô chọn sân bay, hiện đủ tên có mã IATA.
  await page.goto("/flights");
  const flightFrom = page.getByRole("combobox", { name: "Điểm đi" });
  await flightFrom.click();
  await expect(page.getByRole("option", { name: /Phú Quốc \(PQC\)/ })).toBeVisible();
});
