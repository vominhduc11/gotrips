/**
 * Định dạng mã đơn do gotrips-api sinh: "GT" + 6 ký tự, bỏ ký tự dễ đọc nhầm 0/O, 1/I/L. Khớp `BookingCodeGenerator`
 * của API: đổi một nơi phải đổi nơi kia.
 */
export const BOOKING_CODE_PATTERN = /^GT[2-9A-HJKMNP-Z]{6}$/;

/**
 * Mã lấy từ URL là dữ liệu không tin cậy: client do Orval sinh ghép thẳng `/bookings/${code}` mà không mã hoá, nên phải
 * đúng định dạng trước khi gọi API (nếu không, `me` hay `../auth/me` sẽ gọi sang endpoint khác).
 */
export function isBookingCode(value: string): boolean {
  return BOOKING_CODE_PATTERN.test(value);
}
