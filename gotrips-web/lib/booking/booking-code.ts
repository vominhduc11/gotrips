/**
 * Mã đơn đặt tour dễ đọc: "GT" + 6 ký tự, ví dụ "GT7K4Q2M".
 *
 * Mã cũng là NỘI DUNG CHUYỂN KHOẢN nên:
 *  - chỉ có chữ in hoa và số, không dấu gạch (nhiều app ngân hàng tự bỏ ký tự đặc biệt trong nội dung);
 *  - bỏ các ký tự dễ đọc nhầm khi khách gõ lại: 0/O, 1/I/L.
 * 31 ký tự × 6 vị trí ≈ 887 triệu tổ hợp — đủ để mã khó đoán và hiếm trùng (nơi tạo mã vẫn kiểm trùng).
 */
export const BOOKING_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const BOOKING_CODE_PREFIX = "GT";
const RANDOM_LENGTH = 6;

export const BOOKING_CODE_PATTERN = /^GT[2-9A-HJKMNP-Z]{6}$/;

export function isBookingCode(value: string): boolean {
  return BOOKING_CODE_PATTERN.test(value);
}

/**
 * Sinh mã mới. `randomBytes` cho phép test truyền byte cố định; mặc định lấy từ `crypto.getRandomValues`
 * (có sẵn ở cả Node lẫn trình duyệt).
 * Lấy `byte % 31` hơi lệch phân phối (256 không chia hết cho 31) — chấp nhận được với mã đơn, không phải bí mật.
 */
export function generateBookingCode(
  randomBytes: Uint8Array = crypto.getRandomValues(new Uint8Array(RANDOM_LENGTH)),
): string {
  let code = BOOKING_CODE_PREFIX;
  for (let i = 0; i < RANDOM_LENGTH; i++) {
    code += BOOKING_CODE_ALPHABET[(randomBytes[i] ?? 0) % BOOKING_CODE_ALPHABET.length];
  }
  return code;
}
