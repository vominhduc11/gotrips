import { z } from "zod";

// Dùng chung cho form (React Hook Form) và Server Action: client báo lỗi sớm, server kiểm lại vì không tin dữ liệu từ trình duyệt.

const email = z
  .string()
  .trim()
  .min(1, "Vui lòng nhập địa chỉ email.")
  .pipe(z.email("Địa chỉ email chưa đúng định dạng, ví dụ: ban@example.com."));

/** Giới hạn trên để chặn mật khẩu khổng lồ (tốn CPU khi băm ở backend); bcrypt cũng chỉ đọc 72 byte. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

/** Đăng nhập: chỉ kiểm tra "có nhập", không áp luật độ mạnh để không lộ chính sách mật khẩu cho người lạ. */
export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Vui lòng nhập mật khẩu."),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

/** Đăng ký: mật khẩu tối thiểu 8 ký tự, có cả chữ và số. */
export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập họ và tên.")
      .min(2, "Họ và tên cần có ít nhất 2 ký tự.")
      .max(100, "Họ và tên không được quá 100 ký tự."),
    email,
    password: z
      .string()
      .min(1, "Vui lòng nhập mật khẩu.")
      .min(PASSWORD_MIN_LENGTH, `Mật khẩu cần có ít nhất ${PASSWORD_MIN_LENGTH} ký tự.`)
      .max(PASSWORD_MAX_LENGTH, `Mật khẩu không được quá ${PASSWORD_MAX_LENGTH} ký tự.`)
      .regex(/\p{L}/u, "Mật khẩu cần có ít nhất một chữ cái.")
      .regex(/\d/, "Mật khẩu cần có ít nhất một chữ số."),
    confirmPassword: z.string().min(1, "Vui lòng nhập lại mật khẩu."),
    // Checkbox chưa tích là `false`; refine để báo lỗi tiếng Việt thay vì lỗi kiểu của Zod.
    acceptTerms: z.boolean().refine((value) => value, "Bạn cần đồng ý với điều khoản để tạo tài khoản."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu nhập lại chưa khớp.",
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
