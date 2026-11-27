import { expect, test as base, type APIRequestContext, type Page } from "@playwright/test";
import { randomInt, randomUUID } from "node:crypto";

/**
 * Hàm/fixture dùng chung cho các spec (không phải spec, nên không có đuôi `.spec.ts`).
 *
 * Mọi thứ là THẬT: tài khoản tạo qua gotrips-api (`POST /auth/register`), giá trị kỳ vọng đọc từ API, đơn đặt trong e2e
 * trừ chỗ/phòng/ghế thật trong DB. Khi chạy E2E phải có API + DB (`docker compose up gotrips-db gotrips-api`, đã có dữ
 * liệu seed) và web `next start` phải trỏ tới API đó (`API_URL`, mặc định http://localhost:8080 — cùng biến mà web
 * dùng). Mỗi test tạo một tài khoản email riêng; đơn vé/phòng dùng ngày xa ngẫu nhiên nên chạy lại nhiều lần không hết
 * chỗ. Tài khoản và đơn test tích luỹ trong DB dev (email `e2e-<uuid>@example.com`).
 */
export const API_URL = (process.env.API_URL ?? "http://localhost:8080").replace(/\/+$/, "");

export type TestUser = { fullName: string; email: string; password: string };

/** GET một đường dẫn của gotrips-api (để lấy giá trị kỳ vọng). */
export async function apiGet<T>(
  request: APIRequestContext,
  path: string,
  params?: Record<string, string | number>,
): Promise<T> {
  const response = await request.get(`${API_URL}${path}`, { params });
  expect(response.ok(), `GET ${path} → ${response.status()} ${await response.text()}`).toBe(true);
  return (await response.json()) as T;
}

/** Đăng nhập qua API, trả access token (để test dựng dữ liệu bằng chính API). */
export async function apiLogin(request: APIRequestContext, user: TestUser): Promise<string> {
  const response = await request.post(`${API_URL}/auth/login`, {
    data: { email: user.email, password: user.password },
  });
  expect(response.status(), await response.text()).toBe(200);
  return ((await response.json()) as { accessToken: string }).accessToken;
}

/** POST có Bearer token; trả mã trạng thái + body (kể cả khi lỗi, để test kiểm 409). */
export async function apiPost(request: APIRequestContext, path: string, token: string, data: unknown) {
  const response = await request.post(`${API_URL}${path}`, { data, headers: { Authorization: `Bearer ${token}` } });
  return { status: response.status(), body: (await response.json()) as Record<string, unknown> };
}

export const testContact = { fullName: "Minh Anh", email: "e2e-lien-he@example.com", phone: "0901 234 567" };

/** 8990000 → "8.990.000" (phần số của `formatVND`, tránh lệch vì khoảng trắng không ngắt trước "₫"). */
export const money = (amount: number) => new Intl.NumberFormat("vi-VN").format(amount);

/** Hôm nay theo giờ Việt Nam, `YYYY-MM-DD` (cùng cách tính với `getTodayInVietnam`). */
export function todayInVietnam(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Ngày xa ngẫu nhiên trong tương lai (2 tháng đến ~2,5 năm) cho đơn vé/phòng. */
export function randomFutureDate(): string {
  return addDays(todayInVietnam(), 60 + randomInt(850));
}

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

export const BOOKING_CODE = /GT[2-9A-HJKMNP-Z]{6}/;

/** Đang ở trang chi tiết đơn: trả mã đơn ở tiêu đề. */
export async function expectBookingPage(page: Page): Promise<string> {
  await expect(page).toHaveURL(new RegExp(`/bookings/${BOOKING_CODE.source}$`));
  const heading = page.getByRole("heading", { level: 1, name: BOOKING_CODE });
  await expect(heading).toBeVisible();
  return (await heading.textContent())?.trim() ?? "";
}

/** Dòng của đơn `code` ở trang danh sách đơn. Không lọc theo chữ: thông báo (toast) cũng là `listitem` có mã đơn. */
export function bookingRow(page: Page, code: string) {
  return page.getByRole("listitem").filter({ has: page.getByRole("link", { name: `Xem chi tiết đơn ${code}` }) });
}

export { expect };
