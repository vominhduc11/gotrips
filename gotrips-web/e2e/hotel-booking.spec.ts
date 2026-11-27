import type { APIRequestContext, Page } from "@playwright/test";
import type { HotelDetailResponse, HotelSearchResponse } from "../lib/api/generated/model";
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

/**
 * Luồng khách sạn: tìm ở /hotels → trang chi tiết (chọn phòng, ngày, khách) → đăng nhập giữa chừng → đặt phòng 2 bước →
 * trang đơn. Khách sạn, phòng, giá đọc từ API; đơn giữ phòng thật nên dùng ngày xa ngẫu nhiên.
 * "Resort Biển Xanh" (Nha Trang) là khách sạn đang ẩn trong dữ liệu seed.
 */

const VILLA = "villa-thong-xanh-da-lat";
const HIDDEN_HOTEL = "resort-bien-xanh-nha-trang";
const NIGHTS = 3;

function searchApi(request: APIRequestContext, checkIn: string, guests: number) {
  return apiGet<HotelSearchResponse>(request, "/hotels", {
    destination: "da-lat",
    checkIn,
    checkOut: addDays(checkIn, NIGHTS),
    guests,
    rooms: 1,
  });
}

const searchPath = (checkIn: string, guests: number) =>
  `/hotels?destination=da-lat&checkIn=${checkIn}&checkOut=${addDays(checkIn, NIGHTS)}&guests=${guests}&rooms=1`;

const hotelDetail = (request: APIRequestContext, slug: string) =>
  apiGet<HotelDetailResponse>(request, `/hotels/${slug}`);

const bookingCard = (page: Page) => page.getByRole("complementary", { name: "Giá và đặt phòng" });

/** Đợi trang chi tiết hydrate xong: thẻ đã áp lựa chọn trên URL (việc này chỉ chạy sau khi mount). */
async function expectCardRoom(page: Page, roomName: string) {
  await expect(bookingCard(page).getByRole("combobox", { name: "Loại phòng" })).toContainText(roomName);
}

test("tìm khách sạn: kết quả, phòng, tổng tiền và thứ tự theo API", async ({ page, request }) => {
  const checkIn = randomFutureDate();
  for (const guests of [2, 3]) {
    const api = await searchApi(request, checkIn, guests);
    await page.goto(searchPath(checkIn, guests));
    const results = page.getByRole("region", { name: `Khách sạn ở ${api.destinationName}` });
    await expect(results.getByRole("status")).toHaveText(`${api.items.length} khách sạn còn phòng phù hợp`);

    const cards = results.getByRole("article");
    await expect(cards).toHaveCount(api.items.length);
    for (const [index, item] of api.items.entries()) {
      await expect(cards.nth(index)).toContainText(item.name);
      await expect(cards.nth(index)).toContainText(item.room.name);
      await expect(cards.nth(index)).toContainText(money(item.totalPrice));
    }
  }
});

test("kết quả → chi tiết (điền sẵn) → chọn phòng → đăng nhập giữa chừng → đặt phòng 2 bước → đơn PENDING", async ({
  page,
  request,
  user,
}) => {
  const checkIn = randomFutureDate();
  const checkOut = addDays(checkIn, NIGHTS);
  const result = (await searchApi(request, checkIn, 2)).items.find((item) => item.slug === VILLA)!;
  const other = (await hotelDetail(request, VILLA)).roomTypes.find((r) => r.id !== result.room.id)!;
  await page.goto(searchPath(checkIn, 2));
  await page.getByRole("link", { name: `Xem phòng ${result.name}` }).click();

  await expect(page).toHaveURL(new RegExp(`/hotels/${VILLA}\\?room=${result.room.id}&checkIn=${checkIn}&checkOut=${checkOut}$`));
  await expectCardRoom(page, result.room.name);
  await expect(bookingCard(page)).toContainText(`${NIGHTS} đêm`);
  await expect(bookingCard(page)).toContainText(money(result.totalPrice));

  // "Chọn phòng này" ở danh sách đổi phòng trong thẻ và ghi lên URL.
  await page.getByRole("button", { name: `Chọn phòng này (${other.name})` }).click();
  await expect(page.getByRole("button", { name: `Đã chọn (${other.name})` })).toBeVisible();
  await expectCardRoom(page, other.name);
  const total = money(other.pricePerNight * NIGHTS);
  await expect(bookingCard(page)).toContainText(total);
  await expect(page).toHaveURL(new RegExp(`room=${other.id}`));

  // Chưa đăng nhập → đăng nhập → quay lại đúng trang đặt phòng.
  await bookingCard(page).getByRole("button", { name: "Đặt phòng" }).click();
  await expect(page).toHaveURL(/\/login\?next=/);
  await submitLoginForm(page, user);
  await expect(page).toHaveURL(new RegExp(`/hotels/${VILLA}/book\\?room=${other.id}&checkIn=${checkIn}&checkOut=${checkOut}$`));

  await expect(
    page.getByRole("heading", { level: 2, name: "Thông tin người liên hệ và người nhận phòng" }),
  ).toBeVisible();
  const summary = page.getByRole("complementary", { name: "Tóm tắt đơn đặt phòng" });
  await expect(summary).toContainText(`1 × ${other.name}`);
  await expect(summary).toContainText(total);

  // Thiếu số điện thoại → báo lỗi, chưa sang bước sau.
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(page.getByText("Vui lòng nhập số điện thoại.")).toBeVisible();
  await page.getByLabel("Số điện thoại").fill("0901 234 567");
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await expect(page).toHaveURL(/step=xac-nhan/);
  await expect(page.getByRole("heading", { level: 2, name: "Xác nhận đặt phòng" })).toBeFocused();
  await expect(page.getByRole("heading", { level: 3, name: "Kỳ lưu trú" })).toBeVisible();
  await page.getByRole("button", { name: "Xác nhận đặt phòng" }).click();

  const code = await expectBookingPage(page);
  await expect(page.getByText("Đơn đặt khách sạn")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Kỳ lưu trú" })).toBeVisible();
  await expect(page.getByText("Trạng thái đơn: Chờ xác nhận")).toBeVisible();
  await expect(page.getByRole("region", { name: "Hướng dẫn chuyển khoản" })).toContainText(total);
  // Trang đặt phòng vừa rời vẫn nằm ẩn trong DOM (`<Activity>`) nên phải giới hạn trong khối "Thanh toán".
  await expect(page.getByRole("region", { name: "Thanh toán" })).toContainText(
    new RegExp(`${money(other.pricePerNight).replace(/\./g, "\\.")}\\s₫ × ${NIGHTS} đêm × 1 phòng`),
  );

  await page.goto("/bookings");
  const item = bookingRow(page, code);
  await expect(item).toContainText(`Khách sạn · ${result.destinationName}`);
  await expect(item).toContainText(result.name);
});

test("người khác vừa lấy hết phòng trước khi xác nhận → lỗi chung ở đầu form", async ({ page, request, user }) => {
  const checkIn = randomFutureDate();
  const checkOut = addDays(checkIn, NIGHTS);
  const room = (await hotelDetail(request, VILLA)).roomTypes[0]!;
  await loginAs(page, user);
  await page.goto(`/hotels/${VILLA}/book?room=${room.id}&checkIn=${checkIn}&checkOut=${checkOut}`);
  await page.getByLabel("Số điện thoại").fill("0901 234 567");
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(page).toHaveURL(/step=xac-nhan/);

  // Giữ hết phòng của loại này cho đúng kỳ (API báo còn bao nhiêu thì đặt bấy nhiêu, tới khi hết hẳn).
  const token = await apiLogin(request, await createTestUser(request));
  let rooms = 10;
  for (let attempt = 0; ; attempt++) {
    expect(attempt).toBeLessThan(10);
    const response = await apiPost(request, "/bookings/hotels", token, {
      roomTypeId: room.id,
      checkIn,
      checkOut,
      guests: rooms,
      rooms,
      contact: testContact,
      guestName: "Người Khác",
    });
    if (response.status === 201) continue;
    expect(response.status, JSON.stringify(response.body)).toBe(409);
    const left = /chỉ còn (\d+) phòng/.exec(String(response.body.detail));
    if (!left) break;
    rooms = Number(left[1]);
  }

  await page.getByRole("button", { name: "Xác nhận đặt phòng" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Loại phòng này đã hết phòng" })).toBeVisible();
  await expect(page).toHaveURL(/\/book\?/);
});

test("thẻ Đặt phòng: tăng khách quá sức chứa thì tự thêm phòng; chưa chọn ngày thì báo lỗi", async ({ page, request }) => {
  const room = (await hotelDetail(request, VILLA)).roomTypes[0]!;
  expect(room.maxGuests).toBe(2);
  await page.goto(`/hotels/${VILLA}?room=${room.id}`);
  await expectCardRoom(page, room.name);
  const card = bookingCard(page);

  await card.getByRole("button", { name: "Tăng số khách" }).click(); // 3 khách, phòng 2 khách → 2 phòng
  await expect(page).toHaveURL(/guests=3&rooms=2/);
  await expect(card.getByRole("button", { name: "Giảm số phòng" })).toBeDisabled();

  await card.getByRole("button", { name: "Đặt phòng" }).click();
  await expect(card.getByText("Vui lòng chọn ngày nhận phòng.")).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/hotels/${VILLA}\\?`));
});

test("nhận phòng ngay hôm nay: thẻ Đặt phòng báo đặt trực tuyến chỉ từ ngày mai", async ({ page, request }) => {
  const room = (await hotelDetail(request, VILLA)).roomTypes[0]!;
  const today = todayInVietnam();
  await page.goto(`/hotels/${VILLA}?room=${room.id}&checkIn=${today}&checkOut=${addDays(today, 1)}`);
  await expectCardRoom(page, room.name);
  await expect(bookingCard(page).getByRole("button", { name: /Ngày nhận – trả phòng/ })).toContainText("→");

  await bookingCard(page).getByRole("button", { name: "Đặt phòng" }).click();
  await expect(
    bookingCard(page).getByText("Đặt phòng trực tuyến chỉ nhận phòng từ ngày mai. Bạn vui lòng chọn ngày khác."),
  ).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/hotels/${VILLA}\\?`));
});

test("mở trang đặt phòng thiếu ngày → về thẻ Đặt phòng; khách sạn bị ẩn → 404", async ({ page, request }) => {
  const room = (await hotelDetail(request, VILLA)).roomTypes[0]!;
  await page.goto(`/hotels/${VILLA}/book?room=${room.id}`);
  await expect(page).toHaveURL(new RegExp(`/hotels/${VILLA}\\?room=${room.id}#dat-phong$`));

  await page.goto(`/hotels/${HIDDEN_HOTEL}`);
  await expect(page.getByRole("heading", { level: 1, name: "Không tìm thấy trang bạn cần" })).toBeVisible();
});
