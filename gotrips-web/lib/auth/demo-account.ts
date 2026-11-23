/**
 * Tài khoản DEMO cho prototype đăng nhập (chưa nối BE/DB). Chỉ để trình diễn luồng đăng nhập;
 * xoá file này cùng đoạn so khớp trong `lib/actions/auth.ts` và `lib/auth/session.ts` khi API có xác thực thật.
 */
export const DEMO_ACCOUNT = {
  email: "test@gmail.com",
  password: "123456",
  name: "Minh Anh",
} as const;
