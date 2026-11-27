import type { APIRequestContext, Page } from "@playwright/test";
import type { TourDepartureResponse, TourDetailResponse, TourSearchResponse } from "../lib/api/generated/model";
import { formatDate, formatSeatsLeft } from "../lib/format";
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
  type TestUser,
} from "./fixtures";
import { expectNotReloaded, markPage } from "./search-tab-helpers";

/**
 * Luồng đặt tour: chọn chuyến ở trang chi tiết → đăng nhập (nếu cần) → trang đặt tour 2 bước → trang đơn.
 *
 * Đơn e2e TRỪ CHỖ THẬT của chuyến trong DB, nên tour được chọn động từ API (còn ít nhất 3 chuyến, mỗi chuyến ≥ 3 chỗ);
 * tránh tour `tour-detail.spec.ts` đang đọc số chỗ để hai spec chạy song song không đạp lên nhau. Chạy rất nhiều lần
 * làm mọi tour hết chỗ thì nạp lại DB dev (`docker compose down -v`).
 */

const READ_ONLY_TOUR = "phu-quoc-4n3d-dao-ngoc-nghi-duong";

interface BookableTour {
  tour: TourDetailResponse;
  /** Các chuyến còn chỗ theo ngày; chuyến đầu được chọn sẵn ở trang chi tiết. */
  open: TourDepartureResponse[];
}

async function pickTour(request: APIRequestContext): Promise<BookableTour> {
  const { items } = await apiGet<TourSearchResponse>(request, "/tours", { guests: 3 });
  for (const card of items) {
    if (card.slug === READ_ONLY_TOUR) continue;
    const tour = await apiGet<TourDetailResponse>(request, `/tours/${card.slug}`);
    const open = tour.departures.filter((d) => !d.isSoldOut);
    if (open.length >= 3 && open.slice(0, 3).every((d) => d.seatsLeft >= 3)) return { tour, open };
  }
  throw new Error("Không còn tour nào đủ chỗ để đặt trong DB dev: nạp lại dữ liệu bằng `docker compose down -v`.");
}

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

/** Trên trang chi tiết tour đang mở: chọn 2 khách ở thẻ "Đặt tour" (chuyến chọn sẵn) rồi đi hết 2 bước, trả mã đơn. */
async function bookTwoSeats(page: Page, { tour, open }: BookableTour, user: TestUser): Promise<string> {
  const departure = open[0]!;
  const total = money(departure.price * 2);
  await chooseDepartureIn(page, bookingCard(page), formatDate(departure.departureDate));
  await bookingCard(page).getByRole("button", { name: "Tăng số khách" }).click();
  await expect(bookingCard(page)).toContainText(total);
  await bookingCard(page).getByRole("button", { name: "Đặt tour" }).click();

  // Vào thẳng bước "Thông tin" — không còn bước chọn lịch.
  await expect(page).toHaveURL(new RegExp(`/tours/${tour.slug}/book\\?departure=${departure.id}&guests=2$`));
  await expect(page.getByRole("heading", { level: 2, name: "Thông tin người liên hệ và người đi" })).toBeVisible();
  await expect(summaryCard(page)).toContainText(formatDate(departure.departureDate));
  await expect(summaryCard(page)).toContainText(total);
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

  return expectBookingPage(page);
}

test("đặt tour 2 bước → đơn PENDING; chuyển trang phía client thấy ngay đơn mới và số chỗ mới", async ({
  page,
  request,
  user,
}) => {
  const bookable = await pickTour(request);
  const departure = bookable.open[0]!;
  await loginAs(page, user);
  // Ghé danh sách đơn TRƯỚC khi đặt: sau khi đặt, quay lại bằng liên kết (không tải lại trang) phải thấy đơn mới.
  await page.goto("/bookings");
  await expect(page.getByText("Bạn chưa có đơn đặt chỗ nào")).toBeVisible();
  await markPage(page);
  await page.getByRole("link", { name: "Khám phá tour" }).click();
  await page.getByRole("link", { name: `Xem chi tiết tour ${bookable.tour.title}` }).first().click();
  await expect(page).toHaveURL(new RegExp(`/tours/${bookable.tour.slug}$`));

  const code = await bookTwoSeats(page, bookable, user);

  await expect(page.getByText("Trạng thái đơn: Chờ xác nhận")).toBeVisible();
  await expect(page.getByText("Thanh toán: Chưa thanh toán")).toBeVisible();
  const transfer = page.getByRole("region", { name: "Hướng dẫn chuyển khoản" });
  await expect(transfer).toContainText(code); // nội dung chuyển khoản = mã đơn
  await expect(transfer).toContainText(money(departure.price * 2));

  await page.getByRole("link", { name: "Tất cả đơn đặt chỗ" }).click();
  await expect(page).toHaveURL(/\/bookings$/);
  const item = bookingRow(page, code);
  await expect(item).toContainText(bookable.tour.title);
  await expect(item).toContainText("Chờ xác nhận");
  await item.getByRole("link", { name: `Xem chi tiết đơn ${code}` }).click();
  await expect(page).toHaveURL(new RegExp(`/bookings/${code}$`));

  // Số chỗ mới: API đã trừ, và trang tour mở bằng liên kết trong đơn hiện đúng số mới (cache đã được làm mới).
  const after = await apiGet<TourDetailResponse>(request, `/tours/${bookable.tour.slug}`);
  expect(after.departures.find((d) => d.id === departure.id)!.seatsLeft).toBeLessThanOrEqual(departure.seatsLeft - 2);
  await page.getByRole("link", { name: bookable.tour.title, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/tours/${bookable.tour.slug}$`));
  await expect(async () => {
    const latest = await apiGet<TourDetailResponse>(request, `/tours/${bookable.tour.slug}`);
    const current = latest.departures.find((d) => d.id === departure.id)!;
    await expect(
      page
        .getByRole("region", { name: "Lịch khởi hành" })
        .getByRole("listitem")
        .filter({ hasText: formatDate(departure.departureDate) }),
    ).toContainText(formatSeatsLeft(current), { timeout: 2000 });
  }).toPass();
  await expectNotReloaded(page);
});

test("'Chọn ngày này' chọn chuyến trong thẻ Đặt tour; chưa đăng nhập → đăng nhập → về đúng bước Thông tin", async ({
  page,
  request,
  user,
}) => {
  const { tour, open } = await pickTour(request);
  const [first, second] = [open[0]!, open[1]!];
  await page.goto(`/tours/${tour.slug}`);
  // Chuyến gần nhất còn chỗ được chọn sẵn ngay trong HTML.
  await expect(bookingCard(page).getByRole("combobox", { name: "Ngày khởi hành" })).toContainText(
    formatDate(first.departureDate),
  );
  await expect(page.getByRole("button", { name: `Đã chọn (${formatDate(first.departureDate)})` })).toBeVisible();

  // Lặp lại tới khi hydrate xong: lần bấm trước khi hydrate không có tác dụng.
  const secondDate = formatDate(second.departureDate);
  await expect(async () => {
    await page.getByRole("button", { name: `Chọn ngày này (${secondDate})` }).click({ timeout: 1000 });
    await expect(page.getByRole("button", { name: `Đã chọn (${secondDate})` })).toBeVisible({ timeout: 1000 });
  }).toPass();
  const trigger = bookingCard(page).getByRole("combobox", { name: "Ngày khởi hành" });
  await expect(trigger).toContainText(secondDate);
  await expect(trigger).toBeFocused();
  if (second.isAlmostFull) await expect(bookingCard(page)).toContainText("Chỉ còn");
  await expect(page).toHaveURL(new RegExp(`/tours/${tour.slug}\\?departure=${second.id}$`));

  await bookingCard(page).getByRole("button", { name: "Tăng số khách" }).click();
  await expect(page).toHaveURL(new RegExp(`departure=${second.id}&guests=2$`));
  await expect(bookingCard(page)).toContainText(money(second.price * 2));
  await bookingCard(page).getByRole("button", { name: "Đặt tour" }).click();

  await expect(page).toHaveURL(/\/login\?next=/);
  await submitLoginForm(page, user);

  await expect(page).toHaveURL(new RegExp(`/tours/${tour.slug}/book\\?departure=${second.id}&guests=2$`));
  await expect(page.getByRole("heading", { level: 2, name: "Thông tin người liên hệ và người đi" })).toBeVisible();
  await expect(page.locator("#booking-traveler-1-name")).toBeVisible(); // 2 dòng người đi
});

test("đổi chuyến bằng hộp thoại 'Thay đổi' không mất thông tin đã nhập", async ({ page, request, user }) => {
  const { tour, open } = await pickTour(request);
  const [first, second, third] = [open[0]!, open[1]!, open[2]!];
  await loginAs(page, user);
  await page.goto(`/tours/${tour.slug}/book?departure=${third.id}`);
  await expect(summaryCard(page)).toContainText(formatDate(third.departureDate));

  const phone = page.locator("#booking-contact-phone");
  await expect(async () => {
    await phone.fill("0901 234 567");
    await summaryCard(page).getByRole("button", { name: /^Thay đổi/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 1000 });
  }).toPass();

  const dialog = page.getByRole("dialog", { name: "Thay đổi chuyến đi" });
  await chooseDepartureIn(page, dialog, formatDate(second.departureDate));
  await dialog.getByRole("button", { name: "Tăng số khách" }).click();
  await expect(dialog).toContainText(money(second.price * 2));
  await dialog.getByRole("button", { name: "Áp dụng" }).click();

  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`/book\\?departure=${second.id}&guests=2$`));
  await expect(summaryCard(page)).toContainText(formatDate(second.departureDate));
  await expect(summaryCard(page)).toContainText("2 khách");
  await expect(phone).toHaveValue("0901 234 567");
  await expect(page.locator("#booking-traveler-1-name")).toBeVisible();

  // "Huỷ" thì giữ nguyên lựa chọn.
  await summaryCard(page).getByRole("button", { name: /^Thay đổi/ }).click();
  await chooseDepartureIn(page, dialog, formatDate(first.departureDate));
  await dialog.getByRole("button", { name: "Huỷ" }).click();
  await expect(summaryCard(page)).toContainText(formatDate(second.departureDate));
});

test("quay lại trang chi tiết chọn ngày khác: trang đặt tour luôn theo ngày vừa chọn", async ({ page, request, user }) => {
  // Lỗi cũ: Next dùng lại form của lần vào trước nên ngày chọn ở lần đầu bị giữ, bỏ qua `?departure=` mới.
  const { tour, open } = await pickTour(request);
  const [second, third] = [open[1]!, open[2]!];
  await loginAs(page, user);
  await page.goto(`/tours/${tour.slug}`);
  await chooseDepartureIn(page, bookingCard(page), formatDate(third.departureDate));
  await bookingCard(page).getByRole("button", { name: "Đặt tour" }).click();
  await expect(page).toHaveURL(new RegExp(`book\\?departure=${third.id}$`));
  await expect(summaryCard(page)).toContainText(formatDate(third.departureDate));

  // Back: thẻ Đặt tour vẫn giữ ngày đã chọn (lựa chọn nằm trên URL trang chi tiết).
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/tours/${tour.slug}\\?departure=${third.id}$`));
  await expect(bookingCard(page).getByRole("combobox", { name: "Ngày khởi hành" })).toContainText(
    formatDate(third.departureDate),
  );

  await page.getByRole("button", { name: `Chọn ngày này (${formatDate(second.departureDate)})` }).click();
  await bookingCard(page).getByRole("button", { name: "Đặt tour" }).click();
  await expect(page).toHaveURL(new RegExp(`book\\?departure=${second.id}$`));
  await expect(summaryCard(page)).toContainText(formatDate(second.departureDate));
});

test("mở trang đặt tour thiếu chuyến hoặc chuyến không đặt được → về thẻ Đặt tour, giữ số khách", async ({
  page,
  request,
}) => {
  const { tour, open } = await pickTour(request);
  await page.goto(`/tours/${tour.slug}/book`);
  await expect(page).toHaveURL(new RegExp(`/tours/${tour.slug}#dat-tour$`));

  await page.goto(`/tours/${tour.slug}/book?departure=999999&guests=3`);
  await expect(page).toHaveURL(new RegExp(`/tours/${tour.slug}\\?guests=3#dat-tour$`));
  // Chuyến lạ → chọn chuyến gần nhất còn chỗ, số khách theo URL.
  await expect(bookingCard(page).getByRole("combobox", { name: "Ngày khởi hành" })).toContainText(
    formatDate(open[0]!.departureDate),
  );
  await expect(bookingCard(page)).toContainText("× 3 khách");
});

test("mở thẳng bước Xác nhận khi chưa nhập thông tin → về bước Thông tin", async ({ page, request, user }) => {
  const { tour, open } = await pickTour(request);
  await loginAs(page, user);
  await page.goto(`/tours/${tour.slug}/book?departure=${open[0]!.id}&step=xac-nhan`);
  await expect(page.getByRole("heading", { level: 2, name: "Thông tin người liên hệ và người đi" })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/book\\?departure=${open[0]!.id}$`));
});

test("lịch sử đơn cần đăng nhập; mã đơn không có hoặc không phải của mình → 404", async ({ page, request, user }) => {
  // Đơn của người khác, tạo thẳng qua API (đặt phòng ngày xa ngẫu nhiên, không đụng chỗ của test khác).
  const other = await createTestUser(request);
  const checkIn = randomFutureDate();
  const hotel = await apiGet<{ roomTypes: { id: number }[] }>(request, "/hotels/villa-thong-xanh-da-lat");
  const others = await apiPost(request, "/bookings/hotels", await apiLogin(request, other), {
    roomTypeId: hotel.roomTypes[0]!.id,
    checkIn,
    checkOut: addDays(checkIn, 1),
    guests: 1,
    rooms: 1,
    contact: testContact,
    guestName: "Người Khác",
  });
  expect(others.status, JSON.stringify(others.body)).toBe(201);

  await page.goto("/bookings");
  await expect(page).toHaveURL(/\/login\?next=%2Fbookings$/);

  await loginAs(page, user);
  await page.goto("/bookings");
  await expect(page.getByText("Bạn chưa có đơn đặt chỗ nào")).toBeVisible();

  for (const code of [String(others.body.code), "GTXXXXXX", "khong-hop-le"]) {
    await page.goto(`/bookings/${code}`);
    await expect(page.getByRole("heading", { level: 1, name: "Không tìm thấy trang bạn cần" })).toBeVisible();
  }
});

test("phiên hỏng: mở đơn thì đưa về đăng nhập kèm đích quay lại", async ({ page, context }) => {
  await context.addCookies([{ name: "gotrips_session", value: "khong.phai.token", url: "http://localhost:3100" }]);
  await page.goto("/bookings/GT222222");
  await expect(page).toHaveURL(/\/login\?next=%2Fbookings%2FGT222222$/);
});
