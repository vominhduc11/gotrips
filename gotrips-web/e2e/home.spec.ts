import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Mở Trang chủ và đợi React hydrate xong rồi mới tương tác. Form được render sẵn ở server, nên nếu bấm "Tìm"
 * trước khi hydrate thì trình duyệt gửi form kiểu HTML thuần (sang /tours) thay vì chạy validate — test sẽ chập chờn.
 */
async function gotoHome(page: Page) {
  await page.goto("/");
  // HTML server trả về KHÔNG có giá trị mặc định ở ô "Số khách"; React Hook Form chỉ điền "2" khi hydrate đã commit
  // xong. Đây là dấu hiệu quan sát được, chắc hơn việc dò thuộc tính nội bộ của React (chỉ chứng tỏ đã render,
  // chưa chắc đã commit). Next không đặt cờ hydrate ở chế độ production.
  await expect(page.locator("#tim-so-khach")).toHaveValue("2");
}

test("trang chủ có h1", async ({ page }) => {
  await gotoHome(page);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("submit form tìm kiếm chuyển tới /tours kèm destination và guests", async ({ page }) => {
  await gotoHome(page);

  // `exact` + role để không khớp nhầm section "Điểm đến phổ biến".
  await page.getByRole("combobox", { name: "Điểm đến", exact: true }).fill("Đà Lạt");
  await page.getByRole("spinbutton", { name: "Số khách" }).fill("3");
  await page.getByRole("button", { name: "Tìm tour" }).click();

  // URL đích phải đúng (trang /tours đọc các tham số này, xem e2e/tours.spec.ts).
  await expect(page).toHaveURL(/\/tours\?/);
  const params = new URL(page.url()).searchParams;
  expect(params.has("destination") || params.has("q")).toBe(true);
  expect(params.get("guests")).toBe("3");
});

test("form tìm kiếm báo lỗi tiếng Việt khi số khách không hợp lệ và không điều hướng", async ({ page }) => {
  await gotoHome(page);

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
  await gotoHome(page);

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

// ---------------------------------------------------------------------------
// Tab dịch vụ: Tour / Khách sạn / Vé máy bay
// ---------------------------------------------------------------------------

/** Chọn ngày ở lịch đang mở: bấm ô thứ `index` trong các ngày còn chọn được (0 = hôm nay theo giờ Việt Nam). */
async function pickEnabledDay(page: Page, index: number) {
  await page.locator('[data-slot="popover-content"] td button:not([disabled])').nth(index).click();
}

/** Mở ô chọn có tìm kiếm trong `panel` rồi chọn lựa chọn khớp `optionName`. */
async function pickOption(page: Page, panel: Locator, fieldName: string, optionName: RegExp) {
  await panel.getByRole("combobox", { name: fieldName }).click();
  await page.getByRole("option", { name: optionName }).click();
  // Đợi popover vừa chọn đóng hẳn (có animation thoát) để lần mở kế tiếp không gặp hai danh sách cùng lúc.
  await expect(page.locator('[data-slot="popover-content"]')).toHaveCount(0);
}

test("chuyển tab dịch vụ bằng chuột và bằng phím mũi tên", async ({ page }) => {
  await gotoHome(page);

  const tour = page.getByRole("tab", { name: /^Tour/ });
  const hotel = page.getByRole("tab", { name: /Khách sạn/ });
  const flight = page.getByRole("tab", { name: /Vé máy bay/ });

  // Mặc định là Tour; hai tab còn lại vẫn ghi "Sắp ra mắt".
  await expect(tour).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: "Tìm tour" })).toBeVisible();
  await expect(hotel).toContainText("Sắp ra mắt");
  await expect(flight).toContainText("Sắp ra mắt");

  // Chuột.
  await hotel.click();
  await expect(hotel).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: "Tìm khách sạn" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tìm tour" })).toBeHidden();

  // Bàn phím: mũi tên phải/trái, Home/End; tab nhận focus và được chọn.
  await page.keyboard.press("ArrowRight");
  await expect(flight).toBeFocused();
  await expect(flight).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: "Tìm chuyến bay" })).toBeVisible();

  await page.keyboard.press("ArrowLeft");
  await expect(hotel).toHaveAttribute("aria-selected", "true");

  await page.keyboard.press("Home");
  await expect(tour).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: "Tìm tour" })).toBeVisible();

  await page.keyboard.press("End");
  await expect(flight).toHaveAttribute("aria-selected", "true");

  // Tab đang chọn không đi vào URL.
  expect(new URL(page.url()).search).toBe("");
});

test("đổi tab không làm mất dữ liệu đã nhập", async ({ page }) => {
  await gotoHome(page);
  await page.getByRole("tab", { name: /Khách sạn/ }).click();
  const hotelPanel = page.getByRole("tabpanel", { name: /Khách sạn/ });
  await pickOption(page, hotelPanel, "Điểm đến", /Đà Lạt/);

  await page.getByRole("tab", { name: /Vé máy bay/ }).click();
  await page.getByRole("tab", { name: /Khách sạn/ }).click();
  await expect(hotelPanel.getByRole("combobox", { name: "Điểm đến" })).toContainText("Đà Lạt");
});

test("form khách sạn báo lỗi tiếng Việt khi thiếu dữ liệu và đưa focus về ô lỗi đầu tiên", async ({ page }) => {
  await gotoHome(page);
  await page.getByRole("tab", { name: /Khách sạn/ }).click();
  const panel = page.getByRole("tabpanel", { name: /Khách sạn/ });

  await panel.getByRole("button", { name: "Tìm khách sạn" }).click();

  await expect(panel.getByRole("alert").filter({ hasText: "Vui lòng chọn điểm đến." })).toBeVisible();
  await expect(panel.getByRole("alert").filter({ hasText: "Vui lòng chọn ngày nhận phòng." })).toBeVisible();
  await expect(panel.getByRole("alert").filter({ hasText: "Vui lòng chọn ngày trả phòng." })).toBeVisible();
  await expect(panel.getByRole("combobox", { name: "Điểm đến" })).toBeFocused();
  await expect(panel.getByRole("combobox", { name: "Điểm đến" })).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Tính năng đang phát triển")).toBeHidden();
});

test("form khách sạn hợp lệ: hiện toast 'Tính năng đang phát triển', không điều hướng", async ({ page }) => {
  await gotoHome(page);
  await page.getByRole("tab", { name: /Khách sạn/ }).click();
  const panel = page.getByRole("tabpanel", { name: /Khách sạn/ });

  // Gõ không dấu vẫn tìm ra "Đà Lạt".
  await panel.getByRole("combobox", { name: "Điểm đến" }).click();
  await page.getByPlaceholder("Tìm thành phố, địa danh…").fill("da lat");
  await page.getByRole("option", { name: /Đà Lạt/ }).click();

  // Nhận phòng hôm nay, trả phòng sau đó 2 ngày; lịch tự đóng khi đủ hai đầu.
  await panel.getByRole("button", { name: /Ngày nhận – trả phòng/ }).click();
  await pickEnabledDay(page, 0);
  await pickEnabledDay(page, 2);
  await expect(panel.getByRole("button", { name: /Ngày nhận – trả phòng/ })).toContainText("2 đêm");
  // Đợi lịch đóng hẳn: khi lịch đóng, Radix trả focus về nút ngày — nếu lúc đó popover khách đã mở thì nó bị đóng theo.
  await expect(page.locator('[data-slot="popover-content"]')).toHaveCount(0);

  // Khách/phòng: tăng khách lên 3.
  await panel.getByRole("button", { name: /Khách và phòng/ }).click();
  await page.getByRole("button", { name: "Tăng khách" }).click();
  await page.getByRole("button", { name: "Xong" }).click();
  await expect(panel.getByRole("button", { name: /Khách và phòng/ })).toContainText("3 khách · 1 phòng");

  const startUrl = page.url();
  await panel.getByRole("button", { name: "Tìm khách sạn" }).click();
  await expect(page.getByText("Tính năng đang phát triển")).toBeVisible();
  expect(page.url()).toBe(startUrl);
});

test("form vé máy bay báo lỗi khi thiếu dữ liệu và khi điểm đi trùng điểm đến", async ({ page }) => {
  await gotoHome(page);
  await page.getByRole("tab", { name: /Vé máy bay/ }).click();
  const panel = page.getByRole("tabpanel", { name: /Vé máy bay/ });

  await panel.getByRole("button", { name: "Tìm chuyến bay" }).click();
  await expect(panel.getByRole("alert").filter({ hasText: "Vui lòng chọn điểm đi." })).toBeVisible();
  await expect(panel.getByRole("alert").filter({ hasText: "Vui lòng chọn điểm đến." })).toBeVisible();
  await expect(panel.getByRole("alert").filter({ hasText: "Vui lòng chọn ngày đi." })).toBeVisible();
  await expect(panel.getByRole("combobox", { name: "Điểm đi" })).toBeFocused();

  // Gõ không dấu vẫn tìm ra sân bay; chọn cùng một sân bay cho cả hai đầu → báo trùng.
  await panel.getByRole("combobox", { name: "Điểm đi" }).click();
  await page.getByPlaceholder("Tìm thành phố hoặc mã sân bay…").fill("ha noi");
  await page.getByRole("option", { name: /Hà Nội \(HAN\)/ }).click();
  await expect(page.locator('[data-slot="popover-content"]')).toHaveCount(0);
  await pickOption(page, panel, "Điểm đến", /Hà Nội \(HAN\)/);
  await expect(panel.getByRole("alert").filter({ hasText: "Điểm đến phải khác điểm đi." })).toBeVisible();
  // Lỗi thiếu điểm đi biến mất ngay khi chọn (validate lại sau lần submit đầu).
  await expect(panel.getByText("Vui lòng chọn điểm đi.")).toBeHidden();
});

test("form vé máy bay khứ hồi: bắt buộc ngày về; nút đổi chiều hoán đổi hai sân bay", async ({ page }) => {
  await gotoHome(page);
  await page.getByRole("tab", { name: /Vé máy bay/ }).click();
  const panel = page.getByRole("tabpanel", { name: /Vé máy bay/ });

  // Một chiều không có ô "Ngày về".
  await expect(panel.getByRole("button", { name: /Ngày về/ })).toBeHidden();
  await panel.getByRole("radio", { name: "Khứ hồi" }).click();
  await expect(panel.getByRole("button", { name: /Ngày về/ })).toBeVisible();

  await pickOption(page, panel, "Điểm đi", /Hà Nội \(HAN\)/);
  await pickOption(page, panel, "Điểm đến", /Đà Nẵng \(DAD\)/);
  await panel.getByRole("button", { name: /Ngày đi/ }).click();
  await pickEnabledDay(page, 0);

  await panel.getByRole("button", { name: "Tìm chuyến bay" }).click();
  await expect(panel.getByRole("alert").filter({ hasText: "Vui lòng chọn ngày về." })).toBeVisible();
  await expect(page.getByText("Tính năng đang phát triển")).toBeHidden();

  await panel.getByRole("button", { name: "Đổi chiều điểm đi và điểm đến" }).click();
  await expect(panel.getByRole("combobox", { name: "Điểm đi" })).toContainText("Đà Nẵng (DAD)");
  await expect(panel.getByRole("combobox", { name: "Điểm đến" })).toContainText("Hà Nội (HAN)");
});

test("form vé máy bay hợp lệ: hiện toast; nút hành khách không cho em bé vượt người lớn", async ({ page }) => {
  await gotoHome(page);
  await page.getByRole("tab", { name: /Vé máy bay/ }).click();
  const panel = page.getByRole("tabpanel", { name: /Vé máy bay/ });

  await pickOption(page, panel, "Điểm đi", /Hà Nội \(HAN\)/);
  await pickOption(page, panel, "Điểm đến", /Hồ Chí Minh \(SGN\)/);
  await panel.getByRole("button", { name: /Ngày đi/ }).click();
  await pickEnabledDay(page, 0);
  await expect(page.locator('[data-slot="popover-content"]')).toHaveCount(0);

  // 1 người lớn → thêm được 1 em bé (1 ≤ 1); em bé thứ hai thì bị khoá.
  await panel.getByRole("button", { name: /Hành khách/ }).click();
  await page.getByRole("button", { name: "Tăng em bé" }).click();
  await expect(page.getByRole("button", { name: "Tăng em bé" })).toBeDisabled();
  // Không giảm người lớn xuống dưới số em bé.
  await expect(page.getByRole("button", { name: "Giảm người lớn" })).toBeDisabled();
  await page.getByRole("button", { name: "Tăng người lớn" }).click();
  await page.getByRole("button", { name: "Xong" }).click();
  await expect(panel.getByRole("button", { name: /Hành khách/ })).toContainText("2 người lớn, 1 em bé");

  // Hạng ghế (Select của shadcn).
  await panel.getByRole("combobox", { name: /Hạng ghế/ }).click();
  await page.getByRole("option", { name: "Thương gia" }).click();

  const startUrl = page.url();
  await panel.getByRole("button", { name: "Tìm chuyến bay" }).click();
  await expect(page.getByText("Tính năng đang phát triển")).toBeVisible();
  expect(page.url()).toBe(startUrl);
});
