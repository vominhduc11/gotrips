import { describe, expect, it } from "vitest";
import { buildAuthHref, buildLoginHref, getSafeRedirectPath } from "./safe-redirect";

describe("getSafeRedirectPath", () => {
  it.each(["/", "/bookings", "/tours/phu-quoc/book?departure=8&guests=2&step=thong-tin", "/#tim-tour"])(
    "giữ đường dẫn nội bộ %s",
    (path) => {
      expect(getSafeRedirectPath(path)).toBe(path);
    },
  );

  it.each([
    "https://gia-mao.com",
    "//gia-mao.com",
    "/\\gia-mao.com",
    "javascript:alert(1)",
    "bookings",
    "/\n/gia-mao.com",
    "/\t/gia-mao.com",
    "",
    "/" + "a".repeat(2001),
  ])("chặn '%s' (open redirect) → về mặc định", (value) => {
    expect(getSafeRedirectPath(value)).toBe("/");
  });

  it("không phải chuỗi → mặc định, có thể đổi mặc định", () => {
    expect(getSafeRedirectPath(undefined)).toBe("/");
    expect(getSafeRedirectPath(42, "/bookings")).toBe("/bookings");
  });
});

describe("buildLoginHref", () => {
  it("mã hoá đích quay lại vào ?next=", () => {
    expect(buildLoginHref("/tours/a/book?departure=8&step=thong-tin")).toBe(
      "/login?next=%2Ftours%2Fa%2Fbook%3Fdeparture%3D8%26step%3Dthong-tin",
    );
  });

  it("đích không an toàn thì bỏ next", () => {
    expect(buildLoginHref("//gia-mao.com")).toBe("/login");
  });
});

describe("buildAuthHref", () => {
  it("giữ đích quay lại khi sang trang đăng ký", () => {
    expect(buildAuthHref("/register", "/tours/a/book?departure=8&guests=2")).toBe(
      "/register?next=%2Ftours%2Fa%2Fbook%3Fdeparture%3D8%26guests%3D2",
    );
  });

  // `URLSearchParams.get` trả null khi URL không có `next`.
  it.each([null, "", "https://gia-mao.com", "//gia-mao.com"])("next = %j → liên kết trơn", (next) => {
    expect(buildAuthHref("/register", next)).toBe("/register");
    expect(buildAuthHref("/login", next)).toBe("/login");
  });
});
