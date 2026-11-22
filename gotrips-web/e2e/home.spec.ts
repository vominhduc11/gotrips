import { expect, test } from "@playwright/test";

test("trang chủ có h1", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("submit form tìm kiếm chuyển tới /tours kèm destination và guests", async ({ page }) => {
  await page.goto("/");

  // `exact` + role để không khớp nhầm section "Điểm đến phổ biến".
  await page.getByRole("combobox", { name: "Điểm đến", exact: true }).fill("Đà Lạt");
  await page.getByRole("spinbutton", { name: "Số khách" }).fill("3");
  await page.getByRole("button", { name: "Tìm tour" }).click();

  // /tours chưa tồn tại (404) nhưng URL đích vẫn phải đúng.
  await expect(page).toHaveURL(/\/tours\?/);
  const params = new URL(page.url()).searchParams;
  expect(params.has("destination") || params.has("q")).toBe(true);
  expect(params.get("guests")).toBe("3");
});

test("form tìm kiếm báo lỗi tiếng Việt khi số khách không hợp lệ và không điều hướng", async ({ page }) => {
  await page.goto("/");

  const guests = page.getByRole("spinbutton", { name: "Số khách" });
  await guests.fill("0");
  await page.getByRole("button", { name: "Tìm tour" }).click();

  await expect(page.getByRole("alert").filter({ hasText: "Vui lòng nhập số khách từ 1 trở lên." })).toBeVisible();
  await expect(guests).toHaveAttribute("aria-invalid", "true");
  await expect(guests).toHaveAttribute("aria-describedby", "loi-so-khach");
  await expect(guests).toBeFocused();
  await expect(page).not.toHaveURL(/\/tours/);
});

test("form nhận ưu đãi: báo lỗi khi trống, sai định dạng, rồi cảm ơn khi hợp lệ", async ({ page }) => {
  await page.goto("/");

  const email = page.getByRole("textbox", { name: "Địa chỉ email của bạn" });
  const submit = page.getByRole("button", { name: "Đăng ký" });

  await submit.click();
  await expect(page.getByText("Vui lòng nhập địa chỉ email.")).toBeVisible();
  await expect(email).toHaveAttribute("aria-invalid", "true");

  await email.fill("khong-hop-le");
  await submit.click();
  await expect(page.getByText("Địa chỉ email chưa đúng định dạng, ví dụ: ban@example.com.")).toBeVisible();

  await email.fill("ban@example.com");
  await submit.click();
  await expect(page.getByText(/Cảm ơn bạn!/)).toBeVisible();
});
