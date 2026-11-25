import { beforeEach, describe, expect, it, vi } from "vitest";

const { io, unstableRethrow } = vi.hoisted(() => ({
  io: vi.fn(async () => {}),
  unstableRethrow: vi.fn<(error: unknown) => void>(),
}));

vi.mock("next/cache", () => ({ io }));
vi.mock("next/navigation", () => ({ unstable_rethrow: unstableRethrow }));

import { loadSection } from "./load-section";

describe("loadSection", () => {
  beforeEach(() => {
    io.mockClear();
    unstableRethrow.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("trả dữ liệu khi nạp thành công", async () => {
    await expect(loadSection("tour", async () => [1, 2, 3])).resolves.toEqual({ ok: true, data: [1, 2, 3] });
  });

  it("dữ liệu rỗng hợp lệ vẫn là thành công (khác với lỗi)", async () => {
    await expect(loadSection("tour", async () => [])).resolves.toEqual({ ok: true, data: [] });
  });

  it("gọi io() trước khi nạp để phần này không chạy lúc build", async () => {
    const order: string[] = [];
    io.mockImplementationOnce(async () => {
      order.push("io");
    });

    await loadSection("tour", async () => {
      order.push("load");
      return [];
    });

    expect(order).toEqual(["io", "load"]);
  });

  it("gói lỗi thành { ok: false } và ghi log nguyên nhân", async () => {
    const result = await loadSection("tour nổi bật", async () => {
      throw new TypeError("fetch failed");
    });

    expect(result).toEqual({ ok: false });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("tour nổi bật"), "TypeError: fetch failed");
  });

  it("ghi kèm digest khi có (lỗi qua ranh giới \"use cache\" chỉ còn digest ở production)", async () => {
    await loadSection("tour", async () => {
      throw Object.assign(new Error("An error occurred in the Server Components render."), { digest: "12345" });
    });

    expect(console.error).toHaveBeenCalledWith(
      expect.any(String),
      "Error: An error occurred in the Server Components render. (digest 12345)",
    );
  });

  it("gọi unstable_rethrow với lỗi bắt được; nếu nó ném lại thì lỗi đi tiếp, không bị nuốt", async () => {
    const internal = new Error("lỗi nội bộ của Next");
    unstableRethrow.mockImplementation((error) => {
      throw error;
    });

    await expect(
      loadSection("tour", async () => {
        throw internal;
      }),
    ).rejects.toBe(internal);
    expect(unstableRethrow).toHaveBeenCalledWith(internal);
    expect(console.error).not.toHaveBeenCalled();
  });
});
