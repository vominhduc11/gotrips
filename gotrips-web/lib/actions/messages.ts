/**
 * Thông báo dùng chung của các Server Action gọi gotrips-api (không có `"use server"` nên import được từ nhiều action).
 */

/** Lỗi mạng, hết thời gian chờ hoặc API trả 5xx: sự cố phía hệ thống, không phải do người dùng nhập sai. */
export const SERVICE_UNAVAILABLE_MESSAGE =
  "Hệ thống đang bận hoặc tạm thời không kết nối được. Bạn vui lòng thử lại sau ít phút.";
