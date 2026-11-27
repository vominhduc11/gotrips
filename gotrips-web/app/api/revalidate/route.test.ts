import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { revalidateTag } = vi.hoisted(() => ({ revalidateTag: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag }));

const secret = "webhook-test-secret";

function request(payload: unknown, header: string | null = secret) {
  return new Request("http://localhost/api/revalidate", {
    method: "POST",
    headers: header ? { "X-Gotrips-Revalidate-Secret": header } : {},
    body: JSON.stringify(payload),
  });
}

beforeEach(() => vi.stubEnv("GOTRIPS_REVALIDATE_SECRET", secret));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("Webhook làm mới cache", () => {
  it.each([null, "wrong", "different-length-secret"])("từ chối bí mật sai hoặc thiếu", async (header) => {
    expect((await POST(request({ tags: ["tours"] }, header))).status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("từ chối khi chưa cấu hình bí mật", async () => {
    vi.stubEnv("GOTRIPS_REVALIDATE_SECRET", "");
    expect((await POST(request({ tags: ["tours"] }))).status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it.each([null, {}, { tags: [] }, { tags: ["tours", "unknown"] }, { tags: [3] }])(
    "từ chối mọi tag của payload không hợp lệ",
    async (body) => {
      expect((await POST(request(body))).status).toBe(400);
      expect(revalidateTag).not.toHaveBeenCalled();
    },
  );

  it("làm hết hạn ngay mỗi tag hợp lệ một lần", async () => {
    expect((await POST(request({ tags: ["tours", "departures", "tours"] }))).status).toBe(204);
    expect(revalidateTag.mock.calls).toEqual([["tours", { expire: 0 }], ["departures", { expire: 0 }]]);
  });
});
