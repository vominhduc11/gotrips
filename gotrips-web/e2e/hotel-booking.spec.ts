import type { Page } from "@playwright/test";
import { expect, submitLoginForm, test } from "./fixtures";

/**
 * Luồng khách sạn: tìm ở /hotels → trang chi tiết (chọn phòng, ngày, khách) → đăng nhập giữa chừng → đặt phòng 2 bước →
 * trang đơn. Ngày cố định ở tương lai xa để test không phụ thuộc hôm nay (như booking.spec.ts dùng chuyến năm 2027).
 *
 * Dữ liệu mock: Đà Lạt có Villa Thông Xanh (Phòng Standard 690.000 ₫ / 2 khách, Phòng Hướng đồi 850.000 ₫ / 3 khách)
 * và Khách sạn Đồi Mây (Phòng Deluxe 1.250.000 ₫ / 2 khách). Resort Biển Xanh (Nha Trang) là HIDDEN.
 */

const CHECK_IN = "2027-06-10";
const CHECK_OUT = "2027-06-13"; // 3 đêm
const SEARCH = `/hotels?destination=da-lat&checkIn=${CHECK_IN}&checkOut=${CHECK_OUT}&guests=2&rooms=1`;
const VILLA = "villa-thong-xanh-da-lat";
const BOOKING_CODE = /GT[2-9A-HJKMNP-Z]{6}/;

const bookingCard = (page: Page) => page.getByRole("complementary", { name: "Giá và đặt phòng" });

/** Đợi trang chi tiết hydrate xong: thẻ đã áp lựa chọn trên URL (việc này chỉ chạy sau khi mount). */
async function expectCardRoom(page: Page, roomName: string) {
  await expect(bookingCard(page).getByRole("combobox", { name: "Loại phòng" })).toContainText(roomName);
}

test("tìm khách sạn: kết quả theo điểm đến, phòng rẻ nhất đủ chỗ, tổng tiền cả kỳ, sắp theo giá", async ({ page }) => {
  await page.goto(SEARCH);
  const results = page.getByRole("region", { name: "Khách sạn ở Đà Lạt" });
  await expect(results.getByRole("status")).toHaveText("2 khách sạn còn phòng phù hợp");

  const cards = results.getByRole("article");
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toContainText("Villa Thông Xanh");
  await expect(cards.nth(0)).toContainText("2.070.000"); // 690.000 × 3 đêm
  await expect(cards.nth(1)).toContainText("Khách sạn Đồi Mây");
  await expect(cards.nth(1)).toContainText("3.750.000");

  // 3 khách: Villa đổi sang Phòng Hướng đồi (3 khách/phòng), Đồi Mây chỉ còn Phòng Gia đình (4 khách).
  await page.goto(SEARCH.replace("guests=2", "guests=3"));
  await expect(page.getByRole("region", { name: "Khách sạn ở Đà Lạt" }).getByRole("article").nth(0)).toContainText(
    "Phòng Hướng đồi",
  );
});

test("kết quả → chi tiết (điền sẵn) → chọn phòng → đăng nhập giữa chừng → đặt phòng 2 bước → đơn PENDING", async ({
  page,
  user,
}) => {
  await page.goto(SEARCH);
  await page.getByRole("link", { name: "Xem phòng Villa Thông Xanh" }).click();

  await expect(page).toHaveURL(new RegExp(`/hotels/${VILLA}\\?room=3&checkIn=${CHECK_IN}&checkOut=${CHECK_OUT}$`));
  await expectCardRoom(page, "Phòng Standard");
  await expect(bookingCard(page)).toContainText("3 đêm");
  await expect(bookingCard(page)).toContainText("2.070.000");

  // "Chọn phòng này" ở danh sách đổi phòng trong thẻ và ghi lên URL.
  await page.getByRole("button", { name: "Chọn phòng này (Phòng Hướng đồi)" }).click();
  await expect(page.getByRole("button", { name: "Đã chọn (Phòng Hướng đồi)" })).toBeVisible();
  await expectCardRoom(page, "Phòng Hướng đồi");
  await expect(bookingCard(page)).toContainText("2.550.000"); // 850.000 × 3 đêm
  await expect(page).toHaveURL(/room=4/);

  // Chưa đăng nhập → đăng nhập → quay lại đúng trang đặt phòng.
  await bookingCard(page).getByRole("button", { name: "Đặt phòng" }).click();
  await expect(page).toHaveURL(/\/login\?next=/);
  await submitLoginForm(page, user);
  await expect(page).toHaveURL(new RegExp(`/hotels/${VILLA}/book\\?room=4&checkIn=${CHECK_IN}&checkOut=${CHECK_OUT}$`));

  await expect(
    page.getByRole("heading", { level: 2, name: "Thông tin người liên hệ và người nhận phòng" }),
  ).toBeVisible();
  const summary = page.getByRole("complementary", { name: "Tóm tắt đơn đặt phòng" });
  await expect(summary).toContainText("1 × Phòng Hướng đồi");
  await expect(summary).toContainText("2.550.000");

  // Thiếu số điện thoại → báo lỗi, chưa sang bước sau.
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(page.getByText("Vui lòng nhập số điện thoại.")).toBeVisible();
  await page.getByLabel("Số điện thoại").fill("0901 234 567");
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await expect(page).toHaveURL(/step=xac-nhan/);
  await expect(page.getByRole("heading", { level: 2, name: "Xác nhận đặt phòng" })).toBeFocused();
  await expect(page.getByRole("heading", { level: 3, name: "Kỳ lưu trú" })).toBeVisible();
  await page.getByRole("button", { name: "Xác nhận đặt phòng" }).click();

  await expect(page).toHaveURL(new RegExp(`/bookings/${BOOKING_CODE.source}$`));
  const code = (await page.getByRole("heading", { level: 1 }).textContent())?.trim() ?? "";
  expect(code).toMatch(BOOKING_CODE);
  await expect(page.getByText("Đơn đặt khách sạn")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Kỳ lưu trú" })).toBeVisible();
  await expect(page.getByText("Trạng thái đơn: Chờ xác nhận")).toBeVisible();
  await expect(page.getByRole("region", { name: "Hướng dẫn chuyển khoản" })).toContainText("2.550.000");
  // Trang đặt phòng vừa rời vẫn nằm ẩn trong DOM (`<Activity>`) nên phải giới hạn trong khối "Thanh toán".
  await expect(page.getByRole("region", { name: "Thanh toán" })).toContainText(/850\.000\s₫ × 3 đêm × 1 phòng/);

  await page.goto("/bookings");
  const item = page.getByRole("listitem").filter({ hasText: code });
  await expect(item).toContainText("Khách sạn · Đà Lạt");
  await expect(item).toContainText("Villa Thông Xanh");
});

test("thẻ Đặt phòng: tăng khách quá sức chứa thì tự thêm phòng; chưa chọn ngày thì báo lỗi", async ({ page }) => {
  await page.goto(`/hotels/${VILLA}?room=3`);
  await expectCardRoom(page, "Phòng Standard");
  const card = bookingCard(page);

  await card.getByRole("button", { name: "Tăng số khách" }).click(); // 3 khách, phòng 2 khách → 2 phòng
  await expect(page).toHaveURL(/guests=3&rooms=2/);
  await expect(card.getByRole("button", { name: "Giảm số phòng" })).toBeDisabled();

  await card.getByRole("button", { name: "Đặt phòng" }).click();
  await expect(card.getByText("Vui lòng chọn ngày nhận phòng.")).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/hotels/${VILLA}\\?`));
});

test("mở trang đặt phòng thiếu ngày → về thẻ Đặt phòng; khách sạn bị ẩn → 404", async ({ page }) => {
  await page.goto(`/hotels/${VILLA}/book?room=3`);
  await expect(page).toHaveURL(new RegExp(`/hotels/${VILLA}\\?room=3#dat-phong$`));

  await page.goto("/hotels/resort-bien-xanh-nha-trang");
  await expect(page.getByRole("heading", { level: 1, name: "Không tìm thấy trang bạn cần" })).toBeVisible();
});
