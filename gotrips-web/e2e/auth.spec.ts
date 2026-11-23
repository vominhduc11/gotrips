import { expect, test } from "@playwright/test";

test.describe("đăng nhập", () => {
  test("có h1, liên kết sang đăng ký, và báo lỗi tiếng Việt khi để trống", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { level: 1, name: "Đăng nhập" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Đăng ký ngay" })).toHaveAttribute("href", "/register");

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

  test("sai thông tin: báo lỗi chung và ở lại trang đăng nhập", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill("test@gmail.com");
    await page.getByLabel("Mật khẩu", { exact: true }).fill("sai-mat-khau");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();

    await expect(page.getByRole("alert").filter({ hasText: "Email hoặc mật khẩu không đúng" })).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("đang đăng nhập: nút khoá, hiện spinner + chữ đang tải, không gửi lần hai, rồi xong thì hết tải", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill("test@gmail.com");
    await page.getByLabel("Mật khẩu", { exact: true }).fill("123456");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();

    // Trong lúc chờ (độ trễ giả lập ~1,2 giây): nút bị khoá, báo busy cho trình đọc màn hình, có spinner.
    const loading = page.getByRole("button", { name: "Đang đăng nhập..." });
    await expect(loading).toBeVisible();
    await expect(loading).toBeDisabled();
    await expect(loading).toHaveAttribute("aria-busy", "true");
    await expect(loading.locator("svg.animate-spin")).toBeVisible();

    // Xong: rời trang đăng nhập, không còn nút ở trạng thái tải.
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("button", { name: "Đang đăng nhập..." })).toHaveCount(0);
  });

  test("sai mật khẩu: hết trạng thái tải và nút dùng lại được để thử lần nữa", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill("test@gmail.com");
    await page.getByLabel("Mật khẩu", { exact: true }).fill("sai-mat-khau");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(page.getByRole("button", { name: "Đang đăng nhập..." })).toBeDisabled();

    await expect(page.getByRole("alert").filter({ hasText: "Email hoặc mật khẩu không đúng" })).toBeVisible();
    const submit = page.getByRole("button", { name: "Đăng nhập", exact: true });
    await expect(submit).toBeEnabled();
    await expect(submit).toHaveAttribute("aria-busy", "false");
  });

  test("tài khoản demo test@gmail.com / 123456: báo thành công và về trang chủ", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill("test@gmail.com");
    await page.getByLabel("Mật khẩu", { exact: true }).fill("123456");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();

    await expect(page.getByText("Đăng nhập thành công")).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test("đăng nhập xong: trang chủ chào theo tên, Header hiện menu người dùng; đăng xuất thì trở lại như khách", async ({ page }) => {
    await page.goto("/");
    // Khách: có nút Đăng nhập, chưa có menu người dùng.
    await expect(page.getByTestId("hero-greeting")).toHaveText("Đặt tour du lịch trực tuyến");
    await expect(page.getByRole("banner").getByRole("link", { name: "Đăng nhập" })).toBeVisible();

    await page.goto("/login");
    await page.getByLabel("Email").fill("test@gmail.com");
    await page.getByLabel("Mật khẩu", { exact: true }).fill("123456");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);

    await expect(page.getByTestId("hero-greeting")).toContainText("Xin chào, Minh Anh");
    const menu = page.getByRole("button", { name: "Tài khoản của Minh Anh" });
    await expect(menu).toBeVisible();
    await expect(page.getByRole("banner").getByRole("link", { name: "Đăng nhập" })).toHaveCount(0);

    // Phiên giữ qua lần tải lại trang.
    await page.reload();
    await expect(page.getByTestId("hero-greeting")).toContainText("Xin chào, Minh Anh");

    await menu.click();
    await expect(page.getByText("test@gmail.com")).toBeVisible();
    await page.getByRole("menuitem", { name: "Đăng xuất" }).click();

    await expect(page.getByTestId("hero-greeting")).toHaveText("Đặt tour du lịch trực tuyến");
    await expect(page.getByRole("banner").getByRole("link", { name: "Đăng nhập" })).toBeVisible();
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

  test("dữ liệu hợp lệ: báo thành công (bản thử nghiệm) và chuyển sang đăng nhập", async ({ page }) => {
    await page.goto("/register");

    await page.getByLabel("Họ và tên").fill("Nguyễn Văn An");
    await page.getByLabel("Email").fill("an@example.com");
    await page.getByLabel("Mật khẩu", { exact: true }).fill("matkhau123");
    await page.getByLabel("Nhập lại mật khẩu").fill("matkhau123");
    await page.getByRole("checkbox").click();
    await page.getByRole("button", { name: "Tạo tài khoản" }).click();

    await expect(page.getByText("Tạo tài khoản thành công")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});
