import { describe, expect, it } from "vitest";
import { fromApiFieldErrors, toFieldErrors, toFormPath } from "./field-errors";

describe("toFieldErrors", () => {
  it("giữ lỗi đầu tiên của mỗi field, khoá theo đường dẫn kiểu React Hook Form", () => {
    const result = toFieldErrors([
      { path: ["email"], message: "A" },
      { path: ["email"], message: "B" },
      { path: ["travelers", 0, "fullName"], message: "C" },
    ]);
    expect(result).toEqual({ email: "A", "travelers.0.fullName": "C" });
  });

  it("bỏ qua lỗi không gắn với field nào", () => {
    expect(toFieldErrors([{ path: [], message: "chung" }])).toEqual({});
  });
});

describe("fromApiFieldErrors", () => {
  const allowed = ["fullName", "email", "password"];

  it("chuyển errors[] của ProblemDetail thành lỗi theo field, giữ lỗi đầu tiên của mỗi field", () => {
    const result = fromApiFieldErrors(
      [
        { field: "password", message: "Mật khẩu cần từ 8 đến 72 ký tự." },
        { field: "password", message: "Mật khẩu cần có cả chữ cái và chữ số." },
        { field: "email", message: "Email này đã được đăng ký." },
      ],
      allowed,
    );
    expect(result).toEqual({ password: "Mật khẩu cần từ 8 đến 72 ký tự.", email: "Email này đã được đăng ký." });
  });

  it("bỏ field mà form không có (không có ô nào để hiển thị lỗi)", () => {
    expect(fromApiFieldErrors([{ field: "roles", message: "x" }], allowed)).toEqual({});
  });

  it("không có errors thì trả object rỗng", () => {
    expect(fromApiFieldErrors(undefined, allowed)).toEqual({});
    expect(fromApiFieldErrors([], allowed)).toEqual({});
  });

  it("đổi tên field kiểu Spring sang đường dẫn của form rồi mới lọc bằng hàm kiểm", () => {
    const result = fromApiFieldErrors(
      [
        { field: "travelers[1].dateOfBirth", message: "Ngày sinh không được sau hôm nay." },
        { field: "contact.phone", message: "Số điện thoại chưa đúng." },
        { field: "roles", message: "x" },
      ],
      (field) => /^(contact\.phone|travelers\.\d+\.dateOfBirth)$/.test(field),
    );
    expect(result).toEqual({
      "travelers.1.dateOfBirth": "Ngày sinh không được sau hôm nay.",
      "contact.phone": "Số điện thoại chưa đúng.",
    });
  });
});

describe("toFormPath", () => {
  it("chỉ đổi chỉ số trong ngoặc vuông", () => {
    expect(toFormPath("passengers[10].fullName")).toBe("passengers.10.fullName");
    expect(toFormPath("guests")).toBe("guests");
  });
});
