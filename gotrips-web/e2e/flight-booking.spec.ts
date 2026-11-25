import { expect, submitLoginForm, test } from "./fixtures";

/**
 * Luồng vé máy bay: tìm ở /flights → chọn chuyến đi (khứ hồi: rồi chuyến về) → đăng nhập giữa chừng → đặt vé 2 bước →
 * trang đơn. Ngày cố định ở tương lai xa để test không phụ thuộc hôm nay.
 *
 * Dữ liệu mock (lib/mock/flights.ts): SGN → HAN có 4 chuyến/ngày (SV201 06:00, MT113 08:30 1.490.000 ₫, CD305 13:15,
 * SV219 19:45); HAN → SGN có CD306 15:40 1.350.000 ₫; HAN → PQC có SV236 22:30 hạ cánh 00:40 hôm sau.
 */

const DEPART = "2027-06-10";
const RETURN = "2027-06-15";
const BOOKING_CODE = /GT[2-9A-HJKMNP-Z]{6}/;

function searchUrl(params: Record<string, string>) {
  return `/flights?${new URLSearchParams({
    tripType: "oneWay",
    from: "SGN",
    to: "HAN",
    departDate: DEPART,
    adults: "1",
    children: "0",
    infants: "0",
    cabin: "economy",
    ...params,
  })}`;
}

/** Hôm nay theo giờ Việt Nam, `YYYY-MM-DD` (cùng cách tính với `getTodayInVietnam`). */
function todayInVietnam() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

test("kết quả một chiều: đúng chặng, sắp theo giờ, giá theo hạng ghế; chuyến đêm hiện +1 ngày", async ({ page }) => {
  await page.goto(searchUrl({ cabin: "business", adults: "2" }));
  await expect(page.getByRole("heading", { level: 2, name: /Chuyến bay: TP\. Hồ Chí Minh – Hà Nội · 10\/06\/2027/ })).toBeVisible();
  await expect(page.getByText("4 chuyến bay · Thương gia · 2 người lớn")).toBeVisible();

  const cards = page.getByRole("article");
  await expect(cards).toHaveCount(4);
  await expect(cards.nth(0)).toContainText("SV201");
  await expect(cards.nth(1)).toContainText("MT113");
  await expect(cards.nth(1)).toContainText("4.172.000"); // 1.490.000 × 2,8
  await expect(cards.nth(1)).toContainText("8.344.000"); // cho 2 người lớn

  await page.goto(searchUrl({ to: "PQC", from: "HAN" }));
  await expect(page.getByRole("article").filter({ hasText: "SV236" })).toContainText("+1");
});

test("khứ hồi: chọn chuyến đi rồi chuyến về → đăng nhập → đặt vé 2 bước → đơn PENDING", async ({ page, user }) => {
  await page.goto(searchUrl({ tripType: "roundTrip", returnDate: RETURN }));
  await expect(page.getByRole("heading", { level: 2, name: /^Chọn chuyến đi:/ })).toBeVisible();

  await page.getByRole("link", { name: "Chọn chuyến đi (MT113 08:30)" }).click();
  await expect(page).toHaveURL(/out=2#chieu-ve$/);
  await expect(page.getByRole("heading", { level: 2, name: /^Chuyến đi đã chọn/ })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: /^Chọn chuyến về: Hà Nội – TP\. Hồ Chí Minh · 15\/06\/2027/ })).toBeVisible();

  // Chưa đăng nhập → đăng nhập → quay lại đúng trang đặt vé.
  await page.getByRole("button", { name: "Chọn chuyến về (CD306 15:40)" }).click();
  await expect(page).toHaveURL(/\/login\?next=/);
  await submitLoginForm(page, user);
  await expect(page).toHaveURL(/\/flights\/book\?tripType=roundTrip&from=SGN&to=HAN&.*&out=2&ret=7$/);

  const summary = page.getByRole("complementary", { name: "Tóm tắt đơn đặt vé" });
  await expect(summary).toContainText("MT113");
  await expect(summary).toContainText("CD306");
  await expect(summary).toContainText("2.840.000"); // 1.490.000 + 1.350.000

  await expect(page.getByRole("heading", { level: 2, name: "Thông tin người liên hệ và hành khách" })).toBeVisible();
  await page.getByLabel("Số điện thoại").fill("0901 234 567");
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(page).toHaveURL(/step=xac-nhan/);
  await expect(page.getByRole("heading", { level: 2, name: "Xác nhận đặt vé" })).toBeFocused();
  await page.getByRole("button", { name: "Xác nhận đặt vé" }).click();

  await expect(page).toHaveURL(new RegExp(`/bookings/${BOOKING_CODE.source}$`));
  const code = (await page.getByRole("heading", { level: 1 }).textContent())?.trim() ?? "";
  expect(code).toMatch(BOOKING_CODE);
  await expect(page.getByText("Đơn đặt vé máy bay")).toBeVisible();
  await expect(page.getByText("Trạng thái đơn: Chờ xác nhận")).toBeVisible();
  await expect(page.getByRole("region", { name: "Hướng dẫn chuyển khoản" })).toContainText("2.840.000");
  await expect(page.getByRole("heading", { level: 2, name: "Hành khách (1)" })).toBeVisible();

  await page.goto("/bookings");
  const item = page.getByRole("listitem").filter({ hasText: code });
  await expect(item).toContainText("Vé máy bay · Khứ hồi · Phổ thông");
  await expect(item).toContainText("TP. Hồ Chí Minh – Hà Nội");
});

test("đặt vé có em bé: thiếu ngày sinh thì báo lỗi, chưa sang bước Xác nhận", async ({ page, user }) => {
  await page.goto("/login");
  await submitLoginForm(page, user);
  await expect(page).not.toHaveURL(/\/login/);

  await page.goto(searchUrl({ infants: "1" }));
  await page.getByRole("button", { name: "Chọn (MT113 08:30)" }).click();
  await expect(page).toHaveURL(/\/flights\/book\?.*infants=1.*&out=2$/);
  await expect(page.getByText("Hành khách 2 · Em bé")).toBeVisible();

  await page.getByLabel("Số điện thoại").fill("0901 234 567");
  await page.getByLabel("Họ và tên").nth(2).fill("Nguyễn Bảo An"); // [0] người liên hệ, [1] người lớn, [2] em bé
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(page.getByText("Vui lòng nhập ngày sinh để kiểm tra độ tuổi.")).toBeVisible();
  await expect(page).not.toHaveURL(/step=xac-nhan/);
});

test("bay ngay hôm nay: báo đã đóng đặt vé trực tuyến và khoá nút chọn", async ({ page }) => {
  await page.goto(searchUrl({ departDate: todayInVietnam() }));
  await expect(page.getByText("Chuyến bay trong ngày hôm nay đã đóng đặt vé trực tuyến")).toBeVisible();
  await expect(page.getByRole("button", { name: "Chọn (MT113 08:30)" })).toBeDisabled();
});

test("mở trang đặt vé khi chưa chọn chuyến → về trang kết quả của lượt tìm", async ({ page }) => {
  await page.goto(searchUrl({}).replace("/flights?", "/flights/book?"));
  await expect(page).toHaveURL(/\/flights\?tripType=oneWay&from=SGN&to=HAN/);
  await expect(page.getByRole("heading", { level: 2, name: /^Chuyến bay:/ })).toBeVisible();
});
