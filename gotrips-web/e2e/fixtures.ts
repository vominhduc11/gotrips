import { expect, test as base, type APIRequestContext, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

/**
 * Hàm/fixture dùng chung cho các spec cần đăng nhập (không phải spec, nên không có đuôi `.spec.ts`).
 *
 * Đăng nhập là THẬT: tài khoản được tạo qua gotrips-api (`POST /auth/register`) nên khi chạy E2E phải có API + DB
 * (`docker compose up gotrips-db gotrips-api`) và web `next start` phải trỏ tới API đó (`API_URL`, mặc định
 * http://localhost:8080 — cùng biến mà web dùng). Mỗi test tạo một tài khoản email riêng nên chạy song song và
 * chạy lại nhiều lần không đụng nhau; tài khoản test tích luỹ trong DB dev (email `e2e-<uuid>@example.com`).
 */
const API_URL = (process.env.API_URL ?? "http://localhost:8080").replace(/\/+$/, "");

export type TestUser = { fullName: string; email: string; password: string };

/** Tạo tài khoản mới qua API. Tên cố định "Minh Anh" để các test kiểm chữ chào / điền sẵn tên người đi. */
export async function createTestUser(request: APIRequestContext): Promise<TestUser> {
  const user: TestUser = { fullName: "Minh Anh", email: `e2e-${randomUUID()}@example.com`, password: "matkhau123" };
  const response = await request.post(`${API_URL}/auth/register`, { data: user });
  expect(
    response.status(),
    `Không tạo được tài khoản test qua ${API_URL}/auth/register — gotrips-api đã chạy chưa? (${await response.text()})`,
  ).toBe(201);
  return user;
}

/**
 * Điền email + mật khẩu ở trang `/login` đang mở rồi bấm "Đăng nhập".
 * Chọn ô theo id của form đăng nhập: khi vừa chuyển từ `/register` sang, Next còn giữ trang đăng ký (đã ẩn) trong DOM
 * nên `getByLabel("Email")` sẽ khớp cả hai form.
 */
export async function submitLoginForm(page: Page, user: Pick<TestUser, "email" | "password">) {
  await page.locator("#login-email").fill(user.email);
  await page.locator("#login-password").fill(user.password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
}

/** Mở `/login` (kèm `?next=` nếu có), đăng nhập và đợi rời khỏi trang đăng nhập. */
export async function loginAs(page: Page, user: TestUser, next?: string) {
  await page.goto(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  await submitLoginForm(page, user);
  await expect(page).not.toHaveURL(/\/login/);
}

/** `test` có thêm fixture `user`: tài khoản mới tạo (chỉ tạo khi test thật sự yêu cầu `user`). */
export const test = base.extend<{ user: TestUser }>({
  // Tên tham số thứ hai là tuỳ ý; không đặt là `use` vì rule react-hooks của ESLint nhầm với hook `use` của React.
  user: async ({ request }, provide) => {
    await provide(await createTestUser(request));
  },
});

export { expect };
