import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("bỏ giá trị falsy và nối class", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });

  it("gộp class Tailwind xung đột, class sau thắng", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("gộp đúng token radius riêng: rounded-card đè rounded-control", () => {
    expect(cn("rounded-control", "rounded-card")).toBe("rounded-card");
  });

  it("gộp đúng token shadow riêng: shadow-card-hover đè shadow-card", () => {
    expect(cn("shadow-card", "shadow-card-hover")).toBe("shadow-card-hover");
  });

  it("không gộp nhầm các nhóm khác nhau (radius vs shadow, màu chữ vs cỡ chữ)", () => {
    expect(cn("rounded-card", "shadow-card")).toBe("rounded-card shadow-card");
    expect(cn("text-ink", "text-sm")).toBe("text-ink text-sm");
  });

  it("gộp max-w-page với max-w khác", () => {
    expect(cn("max-w-md", "max-w-page")).toBe("max-w-page");
  });
});
