import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "./auth";

const validRegister = {
  fullName: "Nguyễn Văn An",
  email: "an@example.com",
  password: "matkhau123",
  confirmPassword: "matkhau123",
  acceptTerms: true,
};

function firstMessage(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues[0]?.message;
}

describe("loginSchema", () => {
  it("chấp nhận email + mật khẩu hợp lệ và cắt khoảng trắng của email", () => {
    const result = loginSchema.safeParse({ email: "  an@example.com ", password: "x" });
    expect(result.success).toBe(true);
    expect(result.data?.email).toBe("an@example.com");
  });

  it("báo lỗi tiếng Việt khi để trống", () => {
    const result = loginSchema.safeParse({ email: "", password: "" });
    const messages = result.error?.issues.map((issue) => issue.message);
    expect(messages).toContain("Vui lòng nhập địa chỉ email.");
    expect(messages).toContain("Vui lòng nhập mật khẩu.");
  });

  it("báo lỗi khi email sai định dạng", () => {
    const result = loginSchema.safeParse({ email: "khong-phai-email", password: "x" });
    expect(firstMessage(result)).toBe("Địa chỉ email chưa đúng định dạng, ví dụ: ban@example.com.");
  });
});

describe("registerSchema", () => {
  it("chấp nhận dữ liệu hợp lệ", () => {
    expect(registerSchema.safeParse(validRegister).success).toBe(true);
  });

  it.each([
    ["quá ngắn", "abc12", "Mật khẩu cần có ít nhất 8 ký tự."],
    ["không có chữ số", "chicoChuCai", "Mật khẩu cần có ít nhất một chữ số."],
    ["không có chữ cái", "12345678", "Mật khẩu cần có ít nhất một chữ cái."],
  ])("từ chối mật khẩu %s", (_name, password, message) => {
    const result = registerSchema.safeParse({ ...validRegister, password, confirmPassword: password });
    expect(result.error?.issues.map((issue) => issue.message)).toContain(message);
  });

  it("đếm độ dài mật khẩu theo byte: 29 chữ 'ế' + 1 chữ số chỉ 30 ký tự nhưng 90 byte nên bị từ chối", () => {
    const password = "ế".repeat(29) + "1";
    const result = registerSchema.safeParse({ ...validRegister, password, confirmPassword: password });
    const issue = result.error?.issues.find((item) => item.message.startsWith("Mật khẩu quá dài"));
    expect(issue?.path).toEqual(["password"]);
  });

  it("chấp nhận mật khẩu đúng 72 byte", () => {
    const password = "a".repeat(71) + "1";
    expect(registerSchema.safeParse({ ...validRegister, password, confirmPassword: password }).success).toBe(true);
  });

  it("báo lỗi ở ô nhập lại khi hai mật khẩu không khớp", () => {
    const result = registerSchema.safeParse({ ...validRegister, confirmPassword: "khac12345" });
    const issue = result.error?.issues.find((item) => item.message === "Mật khẩu nhập lại chưa khớp.");
    expect(issue?.path).toEqual(["confirmPassword"]);
  });

  it("yêu cầu đồng ý điều khoản", () => {
    const result = registerSchema.safeParse({ ...validRegister, acceptTerms: false });
    expect(firstMessage(result)).toBe("Bạn cần đồng ý với điều khoản để tạo tài khoản.");
  });

  it("từ chối họ tên toàn khoảng trắng", () => {
    const result = registerSchema.safeParse({ ...validRegister, fullName: "   " });
    expect(firstMessage(result)).toBe("Vui lòng nhập họ và tên.");
  });
});
