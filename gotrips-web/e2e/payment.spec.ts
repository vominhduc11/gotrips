import { createHmac, randomInt } from "node:crypto";
import type { APIRequestContext } from "@playwright/test";
import {
  addDays,
  API_URL,
  apiGet,
  apiLogin,
  apiPost,
  expect,
  expectBookingPage,
  loginAs,
  money,
  randomFutureDate,
  test,
  testContact,
} from "./fixtures";

/**
 * Thanh toán chuyển khoản qua webhook SePay, đầu cuối: đơn thật, webhook ký HMAC như SePay gửi tới gotrips-api, trang
 * chi tiết đơn tự cập nhật (không tải lại). Cần API đang chạy với cùng Secret Key, ví dụ:
 *   GOTRIPS_SEPAY_WEBHOOK_SECRET=<khoá> docker compose up -d gotrips-api
 * rồi chạy e2e với cùng biến đó. Thiếu biến thì bỏ qua spec này.
 */
const SECRET = process.env.GOTRIPS_SEPAY_WEBHOOK_SECRET;

test.skip(!SECRET, "Cần GOTRIPS_SEPAY_WEBHOOK_SECRET trùng với Secret Key của gotrips-api đang chạy.");

type HotelDetail = { slug: string; roomTypes: { id: number; maxGuests: number }[] };
type BookingDetail = {
  code: string;
  totalAmount: number;
  receivedAmount: number;
  status: string;
  paymentStatus: string;
  bankTransfer: { accountNumber: string; qrImageUrl: string | null; amountDue: number };
};

/** Giờ Việt Nam hiện tại theo định dạng `transactionDate` của SePay. */
function vietnamNow(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "medium" })
    .format(new Date());
}

/** Gửi một giao dịch tiền vào như SePay: body JSON thô, chữ ký sha256=HMAC(secret, "timestamp.body"). */
async function sendTransfer(request: APIRequestContext, id: number, booking: BookingDetail, amount: number) {
  const body = JSON.stringify({
    id,
    gateway: "Vietcombank",
    transactionDate: vietnamNow(),
    accountNumber: booking.bankTransfer.accountNumber.replace(/\s/g, ""),
    subAccount: "",
    code: null,
    content: `${booking.code} chuyen tien`,
    transferType: "in",
    description: "",
    transferAmount: amount,
    accumulated: 0,
    referenceCode: `E2E${id}`,
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", SECRET!).update(`${timestamp}.${body}`).digest("hex");
  const response = await request.post(`${API_URL}/payments/sepay/webhook`, {
    data: body,
    headers: {
      "Content-Type": "application/json",
      "X-SePay-Timestamp": String(timestamp),
      "X-SePay-Signature": `sha256=${signature}`,
    },
  });
  expect(response.status(), await response.text()).toBe(200);
  expect(await response.text()).toBe('{"success":true}');
}

async function readBooking(request: APIRequestContext, token: string, code: string): Promise<BookingDetail> {
  const response = await request.get(`${API_URL}/bookings/${code}`, { headers: { Authorization: `Bearer ${token}` } });
  expect(response.ok()).toBe(true);
  return (await response.json()) as BookingDetail;
}

test("trang đơn tự cập nhật khi SePay báo tiền vào: một phần rồi đủ, đơn tự xác nhận", async ({
  page,
  request,
  user,
}) => {
  const token = await apiLogin(request, user);
  const [featured] = await apiGet<{ slug: string }[]>(request, "/hotels/featured", { limit: 1 });
  const hotel = await apiGet<HotelDetail>(request, `/hotels/${featured!.slug}`);
  const checkIn = randomFutureDate();
  const created = await apiPost(request, "/bookings/hotels", token, {
    roomTypeId: hotel.roomTypes[0]!.id,
    checkIn,
    checkOut: addDays(checkIn, 1),
    guests: 1,
    rooms: 1,
    contact: testContact,
    guestName: "Minh Anh",
    note: null,
  });
  expect(created.status, JSON.stringify(created.body)).toBe(201);
  const booking = created.body as unknown as BookingDetail;
  const total = booking.totalAmount;
  const firstPart = Math.floor(total / 2);

  await loginAs(page, user, `/bookings/${booking.code}`);
  await expectBookingPage(page);
  const transfer = page.getByRole("region", { name: "Hướng dẫn chuyển khoản" });
  await expect(transfer).toContainText(money(total));
  if (booking.bankTransfer.qrImageUrl) {
    await expect(transfer.getByRole("img", { name: /Mã VietQR/ })).toHaveAttribute("src", booking.bankTransfer.qrImageUrl);
  }
  await expect(page.getByRole("status").filter({ hasText: "Đang chờ chuyển khoản" })).toBeVisible();

  const firstId = Date.now() * 1000 + randomInt(1000);
  await sendTransfer(request, firstId, booking, firstPart);
  // Không tải lại trang: trang tự hỏi lại vài giây một lần rồi làm mới phần server dựng.
  await expect(transfer).toContainText("Số tiền còn thiếu", { timeout: 20_000 });
  await expect(transfer).toContainText(money(total - firstPart));
  await expect(transfer).toContainText(money(firstPart));

  await sendTransfer(request, firstId + 1, booking, total - firstPart);
  await expect(page.getByText("Đã nhận thanh toán lúc")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Đơn đã được xác nhận lúc")).toBeVisible();
  await expect(transfer).toHaveCount(0);

  // SePay gửi lại cùng giao dịch: vẫn trả success, tiền không bị cộng thêm.
  await sendTransfer(request, firstId + 1, booking, total - firstPart);
  const after = await readBooking(request, token, booking.code);
  expect(after).toMatchObject({ status: "CONFIRMED", paymentStatus: "PAID", receivedAmount: total });
});
