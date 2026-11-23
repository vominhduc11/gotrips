import { describe, expect, it } from "vitest";
import { getInitials } from "./user";

describe("getInitials", () => {
  it("lấy chữ đầu của từ đầu và từ cuối", () => {
    expect(getInitials("Nguyễn Văn An")).toBe("NA");
    expect(getInitials("Minh Anh")).toBe("MA");
  });

  it("một từ thì chỉ một chữ; viết hoa đúng với chữ có dấu", () => {
    expect(getInitials("an")).toBe("A");
    expect(getInitials("đức")).toBe("Đ");
  });

  it("bỏ khoảng trắng thừa; chuỗi rỗng trả dấu hỏi", () => {
    expect(getInitials("  Lê   Hoa ")).toBe("LH");
    expect(getInitials("   ")).toBe("?");
  });
});
