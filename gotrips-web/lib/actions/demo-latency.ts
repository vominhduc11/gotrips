/**
 * Độ trễ giả lập thời gian gọi API của các Server Action prototype còn lại (đặt tour, khách sạn, vé máy bay), để
 * thấy được trạng thái đang tải của form. Xoá cùng đoạn demo khi nối API thật. (Đăng nhập/đăng ký đã gọi API thật
 * nên không dùng nữa.)
 *
 * Không đặt trong file `"use server"`: file đó chỉ được export hàm async và mọi export đều thành endpoint công khai.
 */
export const DEMO_LATENCY_MS = 1200;

export function simulateLatency(): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, DEMO_LATENCY_MS));
}
