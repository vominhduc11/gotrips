import { describe, expect, it } from "vitest";
import { isBookingCode } from "./booking-code-format";

describe("isBookingCode", () => {
  it("nhận mã đúng định dạng của gotrips-api", () => {
    expect(isBookingCode("GT7K4Q2M")).toBe(true);
    expect(isBookingCode("GT222222")).toBe(true);
  });

  it("từ chối mã sai định dạng, ký tự dễ nhầm, và chuỗi có thể đổi đường dẫn API", () => {
    for (const code of ["gt7k4q2m", "GT7K4Q2", "GT7K4Q2M1", "GT7K4Q20", "GT7K4QOM", "GT7K4QIM", "GT7K4QLM", "me",
      "../auth/me", "GT7K4Q2M/../x", ""]) {
      expect(isBookingCode(code)).toBe(false);
    }
  });
});
