import { randomUUID } from "node:crypto";
import { expect, submitLoginForm, test } from "./fixtures";

// Đăng nhập / đăng ký gọi gotrips-api thật (xem e2e/fixtures.ts): mỗi test tạo tài khoản riêng bằng fixture `user`.

test.describe("đăng nhập", () => {
  test("có h1, liên kết sang đăng ký, và báo lỗi tiếng Việt khi để trống", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { level: 1, name: "Đăng nhập" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Đăng ký ngay" })).toHaveAttribute("href", "/register");
    // Không còn gợi ý tài khoản thử nghiệm: đăng nhập là thật.
    await expect(page.getByText("Tài khoản thử nghiệm")).toHaveCount(0);

    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();

    const email = page.getByLabel("Email");
    await expect(page.getByRole("alert").filter({ hasText: "Vui lòng nhập địa chỉ email." })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "Vui lòng nhập mật khẩu." })).toBeVisible();
    await expect(email).toHaveAttribute("aria-invalid", "true");
    await expect(email).toBeFocused();
  });

  test("nút hiện/ẩn đổi kiểu ô mật khẩu", async ({ page }) => {
    await page.goto("/login");

    const password = page.getByLabel("Mật khẩu", { exact: true });
    await expect(password).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Hiện mật khẩu" }).click();
    await expect(password).toHaveAttribute("type", "text");
  });

  test("sai mật khẩu: báo lỗi chung và ở lại trang đăng nhập", async ({ page, user }) => {
    await page.goto("/login");

    await submitLoginForm(page, { email: user.email, password: "sai-mat-khau-1" });

    await expect(page.getByRole("alert").filter({ hasText: "Email hoặc mật khẩu không đúng" })).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("email chưa đăng ký: cùng thông báo như sai mật khẩu (không lộ email nào đã đăng ký)", async ({ page }) => {
    await page.goto("/login");

    await submitLoginForm(page, { email: `khong-co-${randomUUID()}@example.com`, password: "matkhau123" });

    await expect(page.getByRole("alert").filter({ hasText: "Email hoặc mật khẩu không đúng" })).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("đang đăng nhập: nút khoá, hiện spinner + chữ đang tải, không gửi lần hai, rồi xong thì hết tải", async ({
    page,
    user,
  }) => {
    // Server Action là một POST tới chính `/login`. API thật trả rất nhanh nên làm chậm request ở trình duyệt
    // để quan sát được trạng thái đang tải.
    await page.route(/\/login$/, async (route) => {
      if (route.request().method() === "POST") await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.continue();
    });
    await page.goto("/login");

    await submitLoginForm(page, user);

    // Trong lúc chờ: nút bị khoá, báo busy cho trình đọc màn hình, có spinner.
    const loading = page.getByRole("button", { name: "Đang đăng nhập..." });
    await expect(loading).toBeVisible();
    await expect(loading).toBeDisabled();
    await expect(loading).toHaveAttribute("aria-busy", "true");
    await expect(loading.locator("svg.animate-spin")).toBeVisible();

    // Xong: rời trang đăng nhập, không còn nút ở trạng thái tải.
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("button", { name: "Đang đăng nhập..." })).toHaveCount(0);
  });

  test("sai mật khẩu: hết trạng thái tải và nút dùng lại được để thử lần nữa", async ({ page, user }) => {
    await page.goto("/login");

    await submitLoginForm(page, { email: user.email, password: "sai-mat-khau-1" });

    await expect(page.getByRole("alert").filter({ hasText: "Email hoặc mật khẩu không đúng" })).toBeVisible();
    const submit = page.getByRole("button", { name: "Đăng nhập", exact: true });
    await expect(submit).toBeEnabled();
    await expect(submit).toHaveAttribute("aria-busy", "false");
  });

  test("đăng nhập đúng: báo thành công và về trang chủ", async ({ page, user }) => {
    await page.goto("/login");

    await submitLoginForm(page, user);

    await expect(page.getByText("Đăng nhập thành công")).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test("email gõ chữ hoa và thừa khoảng trắng vẫn đăng nhập được", async ({ page, user }) => {
    await page.goto("/login");

    await submitLoginForm(page, { email: `  ${user.email.toUpperCase()} `, password: user.password });

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId("hero-greeting")).toContainText(`Xin chào, ${user.fullName}`);
  });

  test("đăng nhập xong: trang chủ chào theo tên, Header hiện menu người dùng; đăng xuất thì trở lại như khách", async ({
    page,
    user,
  }) => {
    await page.goto("/");
    // Khách: có nút Đăng nhập, chưa có menu người dùng.
    await expect(page.getByTestId("hero-greeting")).toHaveText("Đặt tour du lịch trực tuyến");
    await expect(page.getByRole("banner").getByRole("link", { name: "Đăng nhập" })).toBeVisible();

    await page.goto("/login");
    await submitLoginForm(page, user);
    await expect(page).toHaveURL(/\/$/);

    // Tên và email đến từ GET /auth/me của API, không phải từ cookie.
    await expect(page.getByTestId("hero-greeting")).toContainText(`Xin chào, ${user.fullName}`);
    const menu = page.getByRole("button", { name: `Tài khoản của ${user.fullName}` });
    await expect(menu).toBeVisible();
    await expect(page.getByRole("banner").getByRole("link", { name: "Đăng nhập" })).toHaveCount(0);

    // Phiên giữ qua lần tải lại trang.
    await page.reload();
    await expect(page.getByTestId("hero-greeting")).toContainText(`Xin chào, ${user.fullName}`);

    await menu.click();
    await expect(page.getByText(user.email)).toBeVisible();
    await page.getByRole("menuitem", { name: "Đăng xuất" }).click();

    await expect(page.getByTestId("hero-greeting")).toHaveText("Đặt tour du lịch trực tuyến");
    await expect(page.getByRole("banner").getByRole("link", { name: "Đăng nhập" })).toBeVisible();
  });

  test("token phiên nằm trong cookie httpOnly: JavaScript trên trang không đọc được", async ({ page, context, user }) => {
    await page.goto("/login");
    await submitLoginForm(page, user);
    await expect(page).toHaveURL(/\/$/);

    const session = (await context.cookies()).find((cookie) => cookie.name === "gotrips_session");
    expect(session?.httpOnly).toBe(true);
    expect(session?.sameSite).toBe("Lax");
    expect(session?.value.split(".")).toHaveLength(3); // JWT do API cấp, không phải email như bản demo cũ

    expect(await page.evaluate(() => document.cookie)).not.toContain("gotrips_session");
  });

  test("cookie phiên hỏng/hết hạn (API trả 401): coi như khách, không lỗi trang, trang cần đăng nhập đẩy về /login", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([{ name: "gotrips_session", value: "khong.phai.jwt", url: baseURL! }]);

    await page.goto("/");
    await expect(page.getByTestId("hero-greeting")).toHaveText("Đặt tour du lịch trực tuyến");
    await expect(page.getByRole("banner").getByRole("link", { name: "Đăng nhập" })).toBeVisible();

    await page.goto("/bookings");
    await expect(page).toHaveURL(/\/login\?next=%2Fbookings$/);
  });
});

test.describe("đăng ký", () => {
  test("có h1, liên kết sang đăng nhập, và báo lỗi khi để trống", async ({ page }) => {
    await page.goto("/register");

    await expect(page.getByRole("heading", { level: 1, name: "Tạo tài khoản" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Đăng nhập", exact: true }).last()).toHaveAttribute("href", "/login");

    await page.getByRole("button", { name: "Tạo tài khoản" }).click();

    await expect(page.getByRole("alert").filter({ hasText: "Vui lòng nhập họ và tên." })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "Bạn cần đồng ý với điều khoản" })).toBeVisible();
  });

  test("báo lỗi khi mật khẩu yếu hoặc nhập lại không khớp", async ({ page }) => {
    await page.goto("/register");

    await page.getByLabel("Họ và tên").fill("Nguyễn Văn An");
    await page.getByLabel("Email").fill("an@example.com");
    await page.getByLabel("Mật khẩu", { exact: true }).fill("chicoChuCai");
    await page.getByLabel("Nhập lại mật khẩu").fill("khac12345");
    await page.getByRole("button", { name: "Tạo tài khoản" }).click();

    await expect(page.getByRole("alert").filter({ hasText: "Mật khẩu cần có ít nhất một chữ số." })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "Mật khẩu nhập lại chưa khớp." })).toBeVisible();
  });

  test("dữ liệu hợp lệ: tạo tài khoản thật, chuyển sang đăng nhập, và đăng nhập được bằng chính tài khoản đó", async ({
    page,
  }) => {
    const email = `e2e-${randomUUID()}@example.com`;
    await page.goto("/register");

    await page.getByLabel("Họ và tên").fill("Nguyễn Văn An");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill("matkhau123");
    await page.getByLabel("Nhập lại mật khẩu").fill("matkhau123");
    await page.getByRole("checkbox").click();
    await page.getByRole("button", { name: "Tạo tài khoản" }).click();

    await expect(page.getByText("Tạo tài khoản thành công")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);

    // Tài khoản được lưu thật: đăng nhập lại bằng đúng thông tin vừa đăng ký.
    await submitLoginForm(page, { email, password: "matkhau123" });
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId("hero-greeting")).toContainText("Xin chào, Nguyễn Văn An");
  });

  test("email đã được đăng ký: báo lỗi ngay ở ô Email (kể cả khi gõ khác chữ hoa/thường), ở lại trang đăng ký", async ({
    page,
    user,
  }) => {
    await page.goto("/register");

    await page.getByLabel("Họ và tên").fill("Người Khác");
    await page.getByLabel("Email").fill(user.email.toUpperCase());
    await page.getByLabel("Mật khẩu", { exact: true }).fill("matkhau123");
    await page.getByLabel("Nhập lại mật khẩu").fill("matkhau123");
    await page.getByRole("checkbox").click();
    await page.getByRole("button", { name: "Tạo tài khoản" }).click();

    await expect(page.getByRole("alert").filter({ hasText: "Email này đã được đăng ký" })).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Email")).toBeFocused();
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole("button", { name: "Tạo tài khoản" })).toBeEnabled();
  });
});
