import type { APIRequestContext, Page } from "@playwright/test";
import type { FlightOptionResponse, HotelSearchResponse } from "../lib/api/generated/model";
import { addDays, apiGet, expect, loginAs, randomFutureDate, submitLoginForm, test } from "./fixtures";
import { expectNotReloaded, markPage } from "./search-tab-helpers";

const PHONE = "0901 234 567";
const accountHeading = (page: Page) => page.getByRole("heading", { level: 1, name: "Tài khoản của tôi" });
const phoneInput = (page: Page) => page.getByRole("textbox", { name: "Số điện thoại", exact: true });
const saveButton = (page: Page) => page.getByRole("button", { name: "Lưu thay đổi", exact: true });

async function savePhone(page: Page, phone: string) {
  await phoneInput(page).fill(phone);
  await saveButton(page).click();
  await expect(saveButton(page)).toBeDisabled();
  await expect(phoneInput(page)).toHaveValue(phone);
}

async function hotelBookingPath(request: APIRequestContext) {
  const checkIn = randomFutureDate();
  const checkOut = addDays(checkIn, 3);
  const { items } = await apiGet<HotelSearchResponse>(request, "/hotels", {
    destination: "da-lat", checkIn, checkOut, guests: 2, rooms: 1,
  });
  const hotel = items[0]!;
  return `/hotels/${hotel.slug}/book?room=${hotel.room.id}&checkIn=${checkIn}&checkOut=${checkOut}&guests=2&rooms=1`;
}

test("khách được đưa tới đăng nhập rồi quay lại trang tài khoản", async ({ page, user }) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=%2Faccount$/);
  await submitLoginForm(page, user);
  await expect(page).toHaveURL(/\/account$/);
  await expect(accountHeading(page)).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Họ và tên" })).toHaveValue(user.fullName);
  const email = page.getByRole("textbox", { name: "Email" });
  await expect(email).toHaveValue(user.email);
  await expect(email).toHaveAttribute("readonly", "");
});

test("mở từ avatar và sửa tên, Header hiện tên mới ngay", async ({ page, user }) => {
  await loginAs(page, user);
  await page.getByRole("button", { name: `Tài khoản của ${user.fullName}` }).click();
  await page.getByRole("menuitem", { name: "Tài khoản của tôi" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await markPage(page);

  const fullName = page.getByRole("textbox", { name: "Họ và tên" });
  const newName = "Nguyễn Minh Anh";
  const headerName = page.getByRole("button", { name: `Tài khoản của ${newName}` });
  await expect(saveButton(page)).toBeDisabled();
  await fullName.fill(`  ${newName}  `);
  await saveButton(page).click();
  await expect(headerName).toBeVisible();
  await expect(fullName).toHaveValue(newName);
  await expect(saveButton(page)).toBeDisabled();
  await expectNotReloaded(page);

  await page.reload();
  await expect(headerName).toBeVisible();
  await expect(fullName).toHaveValue(newName);
});

test("mở trang tài khoản từ menu điện thoại", async ({ page, user }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAs(page, user);
  await page.getByRole("button", { name: "Mở menu" }).click();
  const menu = page.getByRole("navigation", { name: "Menu di động" });
  await expect(menu).toContainText(`Xin chào, ${user.fullName}`);
  await menu.getByRole("link", { name: "Tài khoản của tôi" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(accountHeading(page)).toBeVisible();
  await expect(menu).toBeHidden();
});

test("đổi mật khẩu kiểm mật khẩu hiện tại, giữ phiên và chỉ nhận mật khẩu mới khi đăng nhập lại", async ({ page, user }) => {
  await loginAs(page, user, "/account");
  const current = page.getByLabel("Mật khẩu hiện tại", { exact: true });
  const newPassword = page.getByLabel("Mật khẩu mới", { exact: true });
  const confirmation = page.getByLabel("Nhập lại mật khẩu", { exact: true });
  const password = "matkhauMoi123";
  const submit = page.getByRole("button", { name: "Đổi mật khẩu", exact: true });

  await current.fill("matkhauSai123");
  await newPassword.fill(password);
  await confirmation.fill(password);
  await submit.click();
  await expect(page.getByRole("alert").filter({ hasText: "Mật khẩu hiện tại không đúng." })).toBeVisible();
  await expect(current).toHaveAttribute("aria-invalid", "true");
  await expect(current).toBeFocused();

  await current.fill(user.password);
  await submit.click();
  await expect(page.getByText("Đã đổi mật khẩu")).toBeVisible();
  await expect(current).toHaveValue("");
  await expect(newPassword).toHaveValue("");
  await expect(confirmation).toHaveValue("");
  await expect(page).toHaveURL(/\/account$/);

  await page.getByRole("button", { name: `Tài khoản của ${user.fullName}` }).click();
  await page.getByRole("menuitem", { name: "Đăng xuất" }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Faccount$/);
  await submitLoginForm(page, user);
  await expect(page.getByRole("alert").filter({ hasText: "Email hoặc mật khẩu không đúng" })).toBeVisible();
  await submitLoginForm(page, { email: user.email, password });
  await expect(page).toHaveURL(/\/account$/);
  await expect(accountHeading(page)).toBeVisible();
});

test("lưu và xoá số điện thoại qua lần tải lại, số sai báo lỗi tại ô", async ({ page, user }) => {
  await loginAs(page, user, "/account");
  await savePhone(page, PHONE);
  await page.reload();
  await expect(phoneInput(page)).toHaveValue(PHONE);

  await phoneInput(page).fill("123");
  await saveButton(page).click();
  await expect(page.getByRole("alert").filter({ hasText: "Số điện thoại chưa đúng" })).toBeVisible();
  await expect(phoneInput(page)).toHaveAttribute("aria-invalid", "true");

  await savePhone(page, "");
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Họ và tên" })).toHaveValue(user.fullName);
  await expect(phoneInput(page)).toHaveValue("");
});

for (const savedPhone of [PHONE, ""]) {
  test(`đặt phòng: ô số điện thoại ${savedPhone ? "được điền từ hồ sơ" : "trống khi hồ sơ chưa có số"}`, async ({
    page, request, user,
  }) => {
    await loginAs(page, user, "/account");
    if (savedPhone) await savePhone(page, savedPhone);
    await page.goto(await hotelBookingPath(request));
    await expect(page.getByLabel("Email", { exact: true })).toHaveValue(user.email);
    await expect(phoneInput(page)).toHaveValue(savedPhone);
  });
}

test("đặt vé: điền sẵn số, bước xác nhận dùng số đã sửa cho riêng đơn", async ({ page, request, user }) => {
  const departDate = randomFutureDate();
  const [flight] = await apiGet<FlightOptionResponse[]>(request, "/flights", {
    from: "SGN", to: "HAN", date: departDate, cabin: "ECONOMY", adults: 1,
  });
  await loginAs(page, user, "/account");
  await savePhone(page, PHONE);
  const params = new URLSearchParams({
    tripType: "oneWay", from: "SGN", to: "HAN", departDate, cabin: "economy",
    adults: "1", children: "0", infants: "0", out: String(flight!.scheduleId),
  });
  await page.goto(`/flights/book?${params}`);
  await expect(phoneInput(page)).toHaveValue(PHONE);
  const changedPhone = "0987 654 321";
  await phoneInput(page).fill(changedPhone);
  await page.getByRole("textbox", { name: "Họ và tên", exact: true }).last().fill(user.fullName);
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Xác nhận đặt vé" })).toBeVisible();
  await expect(page.getByText(changedPhone, { exact: true })).toBeVisible();

  await page.goto("/account");
  await expect(phoneInput(page)).toHaveValue(PHONE);
});
