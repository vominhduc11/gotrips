/**
 * Tuỳ chọn `fetch` cho lời gọi API CẦN ĐĂNG NHẬP, dùng token trong cookie phiên (`getSessionToken`). Dữ liệu theo từng
 * người dùng nên tuyệt đối `no-store`, và không gọi trong phạm vi `"use cache"`.
 */
export function bearerRequestInit(token: string): RequestInit {
  return { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" };
}
