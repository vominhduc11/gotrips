import { describe, expect, it } from "vitest";
import { changePasswordSchema, profileSchema } from "./account";

describe("hồ sơ tài khoản", () => {
  it.each([
    ["", ""],
    [" \t ", ""],
    ["  +84901.234.567  ", "+84901.234.567"],
  ])("chuẩn hoá số điện thoại %j", (phone, expected) => {
    expect(profileSchema.parse({ fullName: "  Minh Anh  ", phone })).toEqual({ fullName: "Minh Anh", phone: expected });
  });

  it("báo lỗi số sai ngay ở ô điện thoại", () => {
    const result = profileSchema.safeParse({ fullName: "Minh Anh", phone: "123" });
    expect(result.error?.issues).toEqual([
      expect.objectContaining({ path: ["phone"], message: "Số điện thoại chưa đúng, ví dụ: 0901 234 567." }),
    ]);
  });

  it("từ chối họ tên chỉ có khoảng trắng", () => {
    const result = profileSchema.safeParse({ fullName: "  ", phone: "" });
    expect(result.error?.issues[0]).toMatchObject({ path: ["fullName"], message: "Vui lòng nhập họ và tên." });
  });
});

describe("đổi mật khẩu", () => {
  const valid = { currentPassword: "matkhau123", newPassword: "matkhauMoi123", confirmPassword: "matkhauMoi123" };

  it("chỉ kiểm có nhập mật khẩu hiện tại", () => {
    expect(changePasswordSchema.safeParse({ ...valid, currentPassword: "cũ" }).success).toBe(true);
    const result = changePasswordSchema.safeParse({ ...valid, currentPassword: "" });
    expect(result.error?.issues[0]).toMatchObject({ path: ["currentPassword"] });
  });

  it("gắn lỗi nhập lại không khớp vào confirmPassword", () => {
    const result = changePasswordSchema.safeParse({ ...valid, confirmPassword: "khac123" });
    expect(result.error?.issues).toMatchObject([{ path: ["confirmPassword"], message: "Mật khẩu nhập lại chưa khớp." }]);
  });

  it("gắn lỗi mật khẩu trùng vào newPassword", () => {
    const result = changePasswordSchema.safeParse({ ...valid, currentPassword: valid.newPassword });
    expect(result.error?.issues).toMatchObject([{ path: ["newPassword"], message: "Mật khẩu mới phải khác mật khẩu hiện tại." }]);
  });

  it("kiểm 72 byte UTF-8 của mật khẩu mới", () => {
    const password = `${"ấ".repeat(24)}1`;
    const result = changePasswordSchema.safeParse({ ...valid, newPassword: password, confirmPassword: password });
    expect(result.error?.issues[0]).toMatchObject({ path: ["newPassword"], message: expect.stringContaining("72 byte") });
  });
});
