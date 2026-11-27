import type { APIRequestContext, Page } from "@playwright/test";
import type { FlightOptionResponse } from "../lib/api/generated/model";
import { formatDate } from "../lib/format";
import {
  addDays,
  apiGet,
  apiLogin,
  apiPost,
  bookingRow,
  createTestUser,
  expect,
  expectBookingPage,
  loginAs,
  money,
  randomFutureDate,
  submitLoginForm,
  test,
  testContact,
  todayInVietnam,
} from "./fixtures";
import { expectNotReloaded, markPage } from "./search-tab-helpers";

/**
 * Luồng vé máy bay: tìm ở /flights → chọn chuyến đi (khứ hồi: rồi chuyến về) → đăng nhập giữa chừng → đặt vé 2 bước →
 * trang đơn. Chuyến bay, giá và ghế còn lại đọc từ API; đơn trừ ghế thật nên dùng ngày xa ngẫu nhiên.
 */

type Cabin = "economy" | "business" | "first";
const API_CABIN: Record<Cabin, string> = { economy: "ECONOMY", business: "BUSINESS", first: "FIRST" };

function searchUrl(params: Record<string, string>) {
  return `/flights?${new URLSearchParams({
    tripType: "oneWay",
    from: "SGN",
    to: "HAN",
    adults: "1",
    children: "0",
    infants: "0",
    cabin: "economy",
    ...params,
  })}`;
}

function apiFlights(
  request: APIRequestContext,
  date: string,
  { from = "SGN", to = "HAN", cabin = "economy" as Cabin, adults = 1 } = {},
) {
  return apiGet<FlightOptionResponse[]>(request, "/flights", { from, to, date, cabin: API_CABIN[cabin], adults });
}

const label = (flight: FlightOptionResponse) => `${flight.flightNumber} ${flight.departTime}`;

/** Ngày mà chuyến thứ nhất còn nguyên ghế hạng nhất (để kiểm "hết ghế" mà không phụ thuộc lần chạy trước). */
async function dateWithAllFirstSeats(request: APIRequestContext) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const date = randomFutureDate();
    const [flight] = await apiFlights(request, date, { cabin: "first" });
    if (flight!.seatsLeft === 8) return { date, flight: flight! };
  }
  throw new Error("Không tìm được ngày còn đủ ghế hạng nhất.");
}

const passengerNames = (count: number) => Array.from({ length: count }, (_, i) => `Hành Khách ${i + 1}`);

/** Điền bước "Thông tin" (hành khách đầu điền sẵn) và sang bước Xác nhận. */
async function fillPassengers(page: Page, count: number) {
  await page.getByLabel("Số điện thoại").fill("0901 234 567");
  const names = passengerNames(count);
  // [0] người liên hệ, [1..] hành khách.
  for (let i = 1; i < count; i++) await page.getByLabel("Họ và tên").nth(i + 1).fill(names[i]!);
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(page).toHaveURL(/step=xac-nhan/);
}

test("kết quả một chiều: đúng chặng, thứ tự và giá theo API; chuyến đêm hiện +1 ngày", async ({ page, request }) => {
  const date = randomFutureDate();
  const flights = await apiFlights(request, date, { cabin: "business", adults: 2 });
  await page.goto(searchUrl({ departDate: date, cabin: "business", adults: "2" }));
  const [first] = flights;
  await expect(
    page.getByRole("heading", { level: 2, name: `Chuyến bay: ${first!.from.city} – ${first!.to.city} · ${formatDate(date)}` }),
  ).toBeVisible();
  await expect(page.getByText(`${flights.length} chuyến bay · Thương gia · 2 người lớn`)).toBeVisible();

  const cards = page.getByRole("article");
  await expect(cards).toHaveCount(flights.length);
  for (const [index, flight] of flights.entries()) {
    await expect(cards.nth(index)).toContainText(flight.flightNumber);
    await expect(cards.nth(index)).toContainText(money(flight.fares.adult));
    await expect(cards.nth(index)).toContainText(money(flight.fares.adult * 2)); // cho 2 người lớn
  }

  const nightFlights = await apiFlights(request, date, { from: "HAN", to: "PQC" });
  const overnight = nightFlights.find((f) => f.arrivesNextDay)!;
  await page.goto(searchUrl({ departDate: date, from: "HAN", to: "PQC" }));
  await expect(page.getByRole("article").filter({ hasText: overnight.flightNumber })).toContainText("+1");
});

test("khứ hồi: chọn chuyến đi rồi chuyến về → đăng nhập → đặt vé 2 bước → đơn PENDING", async ({
  page,
  request,
  user,
}) => {
  const date = randomFutureDate();
  const back = addDays(date, 5);
  const outbound = (await apiFlights(request, date))[1]!;
  const inbound = (await apiFlights(request, back, { from: "HAN", to: "SGN" }))[2]!;
  await page.goto(searchUrl({ tripType: "roundTrip", departDate: date, returnDate: back }));
  await expect(page.getByRole("heading", { level: 2, name: /^Chọn chuyến đi:/ })).toBeVisible();

  await page.getByRole("link", { name: `Chọn chuyến đi (${label(outbound)})` }).click();
  await expect(page).toHaveURL(new RegExp(`out=${outbound.scheduleId}#chieu-ve$`));
  await expect(page.getByRole("heading", { level: 2, name: /^Chuyến đi đã chọn/ })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: `Chọn chuyến về: ${outbound.to.city} – ${outbound.from.city} · ${formatDate(back)}`,
    }),
  ).toBeVisible();

  // Chưa đăng nhập → đăng nhập → quay lại đúng trang đặt vé.
  await page.getByRole("button", { name: `Chọn chuyến về (${label(inbound)})` }).click();
  await expect(page).toHaveURL(/\/login\?next=/);
  await submitLoginForm(page, user);
  await expect(page).toHaveURL(
    new RegExp(`/flights/book\\?tripType=roundTrip&from=SGN&to=HAN&.*&out=${outbound.scheduleId}&ret=${inbound.scheduleId}$`),
  );

  const total = money(outbound.fares.adult + inbound.fares.adult);
  const summary = page.getByRole("complementary", { name: "Tóm tắt đơn đặt vé" });
  await expect(summary).toContainText(outbound.flightNumber);
  await expect(summary).toContainText(inbound.flightNumber);
  await expect(summary).toContainText(total);

  await expect(page.getByRole("heading", { level: 2, name: "Thông tin người liên hệ và hành khách" })).toBeVisible();
  await fillPassengers(page, 1);
  await expect(page.getByRole("heading", { level: 2, name: "Xác nhận đặt vé" })).toBeFocused();
  await markPage(page);
  await page.getByRole("button", { name: "Xác nhận đặt vé" }).click();

  const code = await expectBookingPage(page);
  await expect(page.getByText("Đơn đặt vé máy bay")).toBeVisible();
  await expect(page.getByText("Trạng thái đơn: Chờ xác nhận")).toBeVisible();
  await expect(page.getByRole("region", { name: "Hướng dẫn chuyển khoản" })).toContainText(total);
  await expect(page.getByRole("region", { name: "Hướng dẫn chuyển khoản" })).toContainText(code);
  await expect(page.getByRole("heading", { level: 2, name: "Hành khách (1)" })).toBeVisible();

  await page.getByRole("link", { name: "Tất cả đơn đặt chỗ" }).click();
  await expect(page).toHaveURL(/\/bookings$/);
  const item = bookingRow(page, code);
  await expect(item).toContainText("Vé máy bay · Khứ hồi · Phổ thông");
  await expect(item).toContainText(`${outbound.from.city} – ${outbound.to.city}`);
  await expectNotReloaded(page);
});

test("đặt hết ghế hạng nhất: vẫn tới trang đơn; sau đó chuyến hiện 'Không đủ ghế' và bị khoá", async ({
  page,
  request,
  user,
}) => {
  const { date, flight } = await dateWithAllFirstSeats(request);
  await loginAs(page, user);
  await page.goto(searchUrl({ departDate: date, cabin: "first", adults: "8" }));
  await page.getByRole("button", { name: `Chọn (${label(flight)})` }).click();
  await expect(page).toHaveURL(new RegExp(`/flights/book\\?.*&out=${flight.scheduleId}$`));
  await fillPassengers(page, 8);
  await page.getByRole("button", { name: "Xác nhận đặt vé" }).click();

  // Trang đặt vé không được tự chuyển hướng vì "hết ghế" trước khi khách sang trang đơn.
  const code = await expectBookingPage(page);
  await expect(page.getByRole("region", { name: "Thanh toán" })).toContainText(money(flight.fares.adult * 8));
  expect(code).toBeTruthy();
  await expect(page).toHaveURL(new RegExp(`/bookings/${code}$`));

  expect((await apiFlights(request, date, { cabin: "first" }))[0]!.seatsLeft).toBe(0);
  await page.goto(searchUrl({ departDate: date, cabin: "first" }));
  const card = page.getByRole("article").filter({ hasText: flight.flightNumber });
  await expect(card).toContainText("Không đủ ghế");
  await expect(card.getByRole("button", { name: `Chọn (${label(flight)})` })).toBeDisabled();
  // Mở thẳng trang đặt vé của chuyến đã hết ghế → về trang kết quả.
  await page.goto(searchUrl({ departDate: date, cabin: "first", out: String(flight.scheduleId) }).replace("/flights?", "/flights/book?"));
  await expect(page).toHaveURL(/\/flights\?tripType=oneWay/);
});

test("người khác vừa lấy hết ghế trước khi xác nhận → lỗi chung ở đầu form, không tạo đơn", async ({
  page,
  request,
  user,
}) => {
  const { date, flight } = await dateWithAllFirstSeats(request);
  await loginAs(page, user);
  await page.goto(searchUrl({ departDate: date, cabin: "first" }));
  await page.getByRole("button", { name: `Chọn (${label(flight)})` }).click();
  await fillPassengers(page, 1);

  const other = await createTestUser(request);
  const taken = await apiPost(request, "/bookings/flights", await apiLogin(request, other), {
    outboundScheduleId: flight.scheduleId,
    from: "SGN",
    to: "HAN",
    departDate: date,
    cabin: "FIRST",
    contact: testContact,
    passengers: passengerNames(8).map((fullName) => ({ type: "ADULT", fullName })),
  });
  expect(taken.status, JSON.stringify(taken.body)).toBe(201);

  await page.getByRole("button", { name: "Xác nhận đặt vé" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: `Chuyến ${flight.flightNumber} đã hết ghế ở hạng đã chọn.` }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/flights\/book\?/);
  await page.goto("/bookings");
  await expect(page.getByText("Bạn chưa có đơn đặt chỗ nào")).toBeVisible();
});

test("đặt vé có em bé: thiếu ngày sinh thì báo lỗi, chưa sang bước Xác nhận", async ({ page, request, user }) => {
  const date = randomFutureDate();
  const flight = (await apiFlights(request, date))[1]!;
  await loginAs(page, user);

  await page.goto(searchUrl({ departDate: date, infants: "1" }));
  await page.getByRole("button", { name: `Chọn (${label(flight)})` }).click();
  await expect(page).toHaveURL(new RegExp(`/flights/book\\?.*infants=1.*&out=${flight.scheduleId}$`));
  await expect(page.getByText("Hành khách 2 · Em bé")).toBeVisible();

  await page.getByLabel("Số điện thoại").fill("0901 234 567");
  await page.getByLabel("Họ và tên").nth(2).fill("Nguyễn Bảo An"); // [0] người liên hệ, [1] người lớn, [2] em bé
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(page.getByText("Vui lòng nhập ngày sinh để kiểm tra độ tuổi.")).toBeVisible();
  await expect(page).not.toHaveURL(/step=xac-nhan/);
});

test("bay ngay hôm nay: báo đã đóng đặt vé trực tuyến và khoá nút chọn", async ({ page, request }) => {
  const today = todayInVietnam();
  const flight = (await apiFlights(request, today))[1]!;
  expect(flight.isBookable).toBe(false);
  await page.goto(searchUrl({ departDate: today }));
  await expect(page.getByText("Chuyến bay trong ngày hôm nay đã đóng đặt vé trực tuyến")).toBeVisible();
  await expect(page.getByRole("button", { name: `Chọn (${label(flight)})` })).toBeDisabled();
});

test("mở trang đặt vé khi chưa chọn chuyến → về trang kết quả của lượt tìm", async ({ page }) => {
  await page.goto(searchUrl({ departDate: randomFutureDate() }).replace("/flights?", "/flights/book?"));
  await expect(page).toHaveURL(/\/flights\?tripType=oneWay&from=SGN&to=HAN/);
  await expect(page.getByRole("heading", { level: 2, name: /^Chuyến bay:/ })).toBeVisible();
});
