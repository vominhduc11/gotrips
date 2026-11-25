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

test("/hotels: kết quả tìm do API tính (phòng rẻ nhất đủ chỗ, tổng tiền cả kỳ) và gợi ý không có khách sạn đang ẩn", async ({
  page,
}) => {
  // Gợi ý khi chưa tìm: 7 khách sạn (8 trừ "Resort Biển Xanh" đang HIDDEN), thẻ → trang chi tiết.
  await page.goto("/hotels");
  await expect(page.getByRole("heading", { level: 2, name: "Khách sạn gợi ý" })).toBeVisible();
  await expect(page.locator('section[aria-labelledby="ds-khach-san-heading"] ul > li')).toHaveCount(7);
  await expect(page.getByText("Resort Biển Xanh")).toHaveCount(0);

  // Tìm Đà Lạt 3 đêm, 3 khách: Villa đổi sang phòng Hướng đồi (850.000 × 3 = 2.550.000), Đồi Mây sang phòng gia đình.
  await page.goto("/hotels?destination=da-lat&checkIn=2027-06-10&checkOut=2027-06-13&guests=3&rooms=1");
  const cards = page.getByRole("region", { name: "Khách sạn ở Đà Lạt" }).getByRole("article");
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toContainText("Villa Thông Xanh");
  await expect(cards.nth(0)).toContainText("Phòng Hướng đồi");
  await expect(cards.nth(0)).toContainText("2.550.000");
  await expect(cards.nth(1)).toContainText("Phòng Gia đình");
  await expect(page.getByText(/Chưa tải được/)).toHaveCount(0);
});

test("/hotels/[slug]: chi tiết từ API (giờ nhận/trả, tiện ích, loại phòng); khách sạn ẩn và slug lạ là 404", async ({
  page,
}) => {
  await page.goto("/hotels/khach-san-doi-may-da-lat");
  await expect(page.getByRole("heading", { level: 1, name: "Khách sạn Đồi Mây" })).toBeVisible();
  await expect(page.getByText(/Nhận phòng từ 14:00, trả phòng trước 12:00/)).toBeVisible();
  await expect(page.getByText("Hồ bơi nước ấm")).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "Phòng Deluxe" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "Phòng Gia đình" })).toBeVisible();

  // Giờ trả phòng của Villa Thông Xanh là 11:00 (khác mặc định) nên chứng minh giờ đến từ dữ liệu chứ không cố định.
  await page.goto("/hotels/villa-thong-xanh-da-lat");
  await expect(page.getByText(/trả phòng trước 11:00/)).toBeVisible();

  // Khách sạn đang ẩn, slug không có, và `featured` (có endpoint danh sách riêng ở API) đều là 404.
  for (const slug of ["resort-bien-xanh-nha-trang", "khong-ton-tai", "featured"]) {
    await page.goto(`/hotels/${slug}`);
    await expect(page.getByRole("heading", { level: 1, name: "Không tìm thấy trang bạn cần" })).toBeVisible();
  }
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
