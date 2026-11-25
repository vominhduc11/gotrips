import type { Page } from "@playwright/test";
import { expect, loginAs, submitLoginForm, test, type TestUser } from "./fixtures";

// Tour 3: chuyến 8 (14/01/2027, còn 10 chỗ — chuyến gần nhất nên được chọn sẵn), 9 (25/02/2027, còn 4 chỗ),
// 10 (08/04/2027). Mỗi test có trình duyệt riêng nên cookie đơn riêng.
const SLUG = "phu-quoc-4n3d-dao-ngoc-nghi-duong";
const DEPARTURE_ID = 8;
const BOOKING_CODE = /GT[2-9A-HJKMNP-Z]{6}/;

const bookingCard = (page: Page) => page.getByRole("complementary", { name: "Giá và đặt tour" });
const summaryCard = (page: Page) => page.getByRole("complementary", { name: "Tóm tắt đơn đặt tour" });

/** Chọn ngày ở ô "Ngày khởi hành" (trong `scope`: thẻ Đặt tour hoặc hộp thoại). Lặp lại nếu bấm trước khi hydrate xong. */
async function chooseDepartureIn(page: Page, scope: ReturnType<Page["getByRole"]>, date: string) {
  const trigger = scope.getByRole("combobox", { name: "Ngày khởi hành" });
  await expect(async () => {
    await trigger.click();
    await page.getByRole("option", { name: new RegExp(date) }).click({ timeout: 1000 });
    await expect(trigger).toContainText(date, { timeout: 1000 });
  }).toPass();
}

/** Chọn chuyến + 2 khách ở thẻ "Đặt tour" rồi đi hết 2 bước, trả về mã đơn. Cần đã đăng nhập bằng `user`. */
async function createBooking(page: Page, user: TestUser): Promise<string> {
  await page.goto(`/tours/${SLUG}`);
  await chooseDepartureIn(page, bookingCard(page), "14/01/2027");
  await bookingCard(page).getByRole("button", { name: "Tăng số khách" }).click();
  await expect(bookingCard(page)).toContainText("17.980.000");
  await bookingCard(page).getByRole("button", { name: "Đặt tour" }).click();

  // Vào thẳng bước "Thông tin" — không còn bước chọn lịch.
  await expect(page).toHaveURL(new RegExp(`/tours/${SLUG}/book\\?departure=${DEPARTURE_ID}&guests=2$`));
  await expect(page.getByRole("heading", { level: 2, name: "Thông tin người liên hệ và người đi" })).toBeVisible();
  await expect(summaryCard(page)).toContainText("14/01/2027");
  await expect(summaryCard(page)).toContainText("17.980.000");
  // Người liên hệ và khách 1 được điền sẵn theo tài khoản đang đăng nhập.
  await expect(page.locator("#booking-contact-email")).toHaveValue(user.email);
  await expect(page.locator("#booking-traveler-0-name")).toHaveValue(user.fullName);

  // Bỏ trống rồi bấm Tiếp tục: báo lỗi tiếng Việt và ở lại bước này.
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Vui lòng nhập số điện thoại." })).toBeVisible();
  await expect(page).toHaveURL(/guests=2$/);

  await page.locator("#booking-contact-phone").fill("0901 234 567");
  await page.locator("#booking-traveler-1-name").fill("Trần Văn Bình");
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await expect(page).toHaveURL(/step=xac-nhan/);
  await expect(page.getByRole("heading", { level: 2, name: "Xác nhận đặt tour" })).toBeFocused();
  await expect(page.getByRole("heading", { level: 3, name: "Người đi (2)" })).toBeVisible();
  await expect(page.getByText("Trần Văn Bình")).toBeVisible();
  await page.getByRole("button", { name: "Xác nhận đặt tour" }).click();

  await expect(page).toHaveURL(new RegExp(`/bookings/${BOOKING_CODE.source}$`));
  const code = (await page.getByRole("heading", { level: 1 }).textContent())?.trim() ?? "";
  expect(code).toMatch(BOOKING_CODE);
  return code;
}

test("đăng nhập → chọn chuyến ở trang chi tiết → đặt tour 2 bước → thấy đơn PENDING và trong lịch sử", async ({ page, user }) => {
  await loginAs(page, user);
  const code = await createBooking(page, user);

  await expect(page.getByText("Trạng thái đơn: Chờ xác nhận")).toBeVisible();
  await expect(page.getByText("Thanh toán: Chưa thanh toán")).toBeVisible();
  const transfer = page.getByRole("region", { name: "Hướng dẫn chuyển khoản" });
  await expect(transfer).toContainText(code); // nội dung chuyển khoản = mã đơn
  await expect(transfer).toContainText("17.980.000");

  await page.goto("/bookings");
  const item = page.getByRole("listitem").filter({ hasText: code });
  await expect(item).toContainText("Phú Quốc 4N3Đ");
  await expect(item).toContainText("Chờ xác nhận");
  await item.getByRole("link", { name: `Xem chi tiết đơn ${code}` }).click();
  await expect(page).toHaveURL(new RegExp(`/bookings/${code}$`));
});

test("'Chọn ngày này' chọn chuyến trong thẻ Đặt tour; chưa đăng nhập → đăng nhập → về đúng bước Thông tin", async ({
  page,
  user,
}) => {
  await page.goto(`/tours/${SLUG}`);
  // Chuyến gần nhất còn chỗ được chọn sẵn ngay trong HTML prerender.
  await expect(bookingCard(page).getByRole("combobox", { name: "Ngày khởi hành" })).toContainText("14/01/2027");
  await expect(page.getByRole("button", { name: "Đã chọn (14/01/2027)" })).toBeVisible();

  // Lặp lại tới khi hydrate xong: lần bấm trước khi hydrate không có tác dụng.
  await expect(async () => {
    await page.getByRole("button", { name: /\(25\/02\/2027\)$/ }).click();
    await expect(page.getByRole("button", { name: "Đã chọn (25/02/2027)" })).toBeVisible({ timeout: 1000 });
  }).toPass();
  const trigger = bookingCard(page).getByRole("combobox", { name: "Ngày khởi hành" });
  await expect(trigger).toContainText("25/02/2027");
  await expect(trigger).toBeFocused();
  await expect(bookingCard(page)).toContainText("Chỉ còn 4 chỗ");
  await expect(page).toHaveURL(new RegExp(`/tours/${SLUG}\\?departure=9$`));

  await bookingCard(page).getByRole("button", { name: "Tăng số khách" }).click();
  await expect(page).toHaveURL(/departure=9&guests=2$/);
  await expect(bookingCard(page)).toContainText("18.980.000");
  await bookingCard(page).getByRole("button", { name: "Đặt tour" }).click();

  await expect(page).toHaveURL(/\/login\?next=/);
  await submitLoginForm(page, user);

  await expect(page).toHaveURL(new RegExp(`/tours/${SLUG}/book\\?departure=9&guests=2$`));
  await expect(page.getByRole("heading", { level: 2, name: "Thông tin người liên hệ và người đi" })).toBeVisible();
  await expect(page.locator("#booking-traveler-1-name")).toBeVisible(); // 2 dòng người đi
});

test("đổi chuyến bằng hộp thoại 'Thay đổi' không mất thông tin đã nhập", async ({ page, user }) => {
  await loginAs(page, user);
  await page.goto(`/tours/${SLUG}/book?departure=10`);
  await expect(summaryCard(page)).toContainText("08/04/2027");

  const phone = page.locator("#booking-contact-phone");
  await expect(async () => {
    await phone.fill("0901 234 567");
    await summaryCard(page).getByRole("button", { name: /^Thay đổi/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 1000 });
  }).toPass();

  const dialog = page.getByRole("dialog", { name: "Thay đổi chuyến đi" });
  await chooseDepartureIn(page, dialog, "25/02/2027");
  await dialog.getByRole("button", { name: "Tăng số khách" }).click();
  await expect(dialog).toContainText("18.980.000");
  await dialog.getByRole("button", { name: "Áp dụng" }).click();

  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`/book\\?departure=9&guests=2$`));
  await expect(summaryCard(page)).toContainText("25/02/2027");
  await expect(summaryCard(page)).toContainText("2 khách");
  await expect(phone).toHaveValue("0901 234 567");
  await expect(page.locator("#booking-traveler-1-name")).toBeVisible();

  // "Huỷ" thì giữ nguyên lựa chọn.
  await summaryCard(page).getByRole("button", { name: /^Thay đổi/ }).click();
  await chooseDepartureIn(page, dialog, "14/01/2027");
  await dialog.getByRole("button", { name: "Huỷ" }).click();
  await expect(summaryCard(page)).toContainText("25/02/2027");
});

test("quay lại trang chi tiết chọn ngày khác: trang đặt tour luôn theo ngày vừa chọn", async ({ page, user }) => {
  // Lỗi cũ: Next dùng lại form của lần vào trước nên ngày chọn ở lần đầu bị giữ, bỏ qua `?departure=` mới.
  await loginAs(page, user);
  await page.goto(`/tours/${SLUG}`);
  await chooseDepartureIn(page, bookingCard(page), "08/04/2027");
  await bookingCard(page).getByRole("button", { name: "Đặt tour" }).click();
  await expect(page).toHaveURL(/book\?departure=10$/);
  await expect(summaryCard(page)).toContainText("08/04/2027");

  // Back: thẻ Đặt tour vẫn giữ ngày đã chọn (lựa chọn nằm trên URL trang chi tiết).
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/tours/${SLUG}\\?departure=10$`));
  await expect(bookingCard(page).getByRole("combobox", { name: "Ngày khởi hành" })).toContainText("08/04/2027");

  await page.getByRole("button", { name: "Chọn ngày này (25/02/2027)" }).click();
  await bookingCard(page).getByRole("button", { name: "Đặt tour" }).click();
  await expect(page).toHaveURL(/book\?departure=9$/);
  await expect(summaryCard(page)).toContainText("25/02/2027");
});

test("mở trang đặt tour thiếu chuyến hoặc chuyến không đặt được → về thẻ Đặt tour, giữ số khách", async ({ page }) => {
  await page.goto(`/tours/${SLUG}/book`);
  await expect(page).toHaveURL(new RegExp(`/tours/${SLUG}#dat-tour$`));

  await page.goto(`/tours/${SLUG}/book?departure=999&guests=3`);
  await expect(page).toHaveURL(new RegExp(`/tours/${SLUG}\\?guests=3#dat-tour$`));
  // Chuyến lạ → chọn chuyến gần nhất còn chỗ, số khách theo URL.
  await expect(bookingCard(page).getByRole("combobox", { name: "Ngày khởi hành" })).toContainText("14/01/2027");
  await expect(bookingCard(page)).toContainText("× 3 khách");
});

test("mở thẳng bước Xác nhận khi chưa nhập thông tin → về bước Thông tin", async ({ page, user }) => {
  await loginAs(page, user);
  await page.goto(`/tours/${SLUG}/book?departure=${DEPARTURE_ID}&step=xac-nhan`);
  await expect(page.getByRole("heading", { level: 2, name: "Thông tin người liên hệ và người đi" })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/book\\?departure=${DEPARTURE_ID}$`));
});

test("mô phỏng nhân viên: đánh dấu đã thanh toán → xác nhận → huỷ", async ({ page, user }) => {
  await loginAs(page, user);
  await createBooking(page, user);

  const simulator = page.getByRole("region", { name: "Mô phỏng nhân viên" });
  // Chưa thu tiền thì chưa xác nhận được.
  await expect(simulator.getByRole("button", { name: "Xác nhận đơn" })).toBeDisabled();

  await simulator.getByRole("button", { name: "Đánh dấu đã thanh toán" }).click();
  await expect(page.getByText("Thanh toán: Đã thanh toán")).toBeVisible();
  await expect(page.getByRole("region", { name: "Hướng dẫn chuyển khoản" })).toHaveCount(0);

  await simulator.getByRole("button", { name: "Xác nhận đơn" }).click();
  await expect(page.getByText("Trạng thái đơn: Đã xác nhận")).toBeVisible();

  await simulator.getByRole("button", { name: "Huỷ đơn" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Huỷ đơn" }).click();
  await expect(page.getByText("Trạng thái đơn: Đã huỷ")).toBeVisible();
  await expect(page.getByText("GoTrips sẽ hoàn tiền thủ công")).toBeVisible();
  await expect(simulator.getByRole("button", { name: "Huỷ đơn" })).toBeDisabled();
});

test("lịch sử đơn cần đăng nhập; mã đơn không có hoặc không phải của mình → 404", async ({ page, user }) => {
  await page.goto("/bookings");
  await expect(page).toHaveURL(/\/login\?next=%2Fbookings$/);

  await loginAs(page, user);
  await page.goto("/bookings");
  await expect(page.getByText("Bạn chưa có đơn đặt chỗ nào")).toBeVisible();

  for (const code of ["GTXXXXXX", "khong-hop-le"]) {
    await page.goto(`/bookings/${code}`);
    await expect(page.getByRole("heading", { level: 1, name: "Không tìm thấy trang bạn cần" })).toBeVisible();
  }
});
