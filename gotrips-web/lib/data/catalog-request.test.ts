import { describe, expect, it } from "vitest";
import { CATALOG_TIMEOUT_MS, catalogRequestInit } from "./catalog-request";

describe("catalogRequestInit", () => {
  it("timeout ngắn hơn mặc định 10 giây của lib/api/http.ts", () => {
    expect(CATALOG_TIMEOUT_MS).toBeLessThan(10_000);
  });

  it("trả một signal chưa hết hạn", () => {
    expect(catalogRequestInit().signal?.aborted).toBe(false);
  });

  it("mỗi lần gọi tạo signal MỚI (không dùng chung, kẻo một signal hết hạn huỷ mọi lời gọi sau)", () => {
    expect(catalogRequestInit().signal).not.toBe(catalogRequestInit().signal);
  });
});
